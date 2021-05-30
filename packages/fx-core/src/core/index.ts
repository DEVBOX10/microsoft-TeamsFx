// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  Core,
  DialogMsg,
  DialogType,
  err,
  Func,
  ok,
  Platform,
  QTreeNode,
  QuestionType,
  Result,
  returnSystemError,
  SolutionContext,
  Stage,
  TreeCategory,
  TreeItem,
  returnUserError,
  UserError,
  SingleSelectQuestion,
  FxError,
  ConfigFolderName,
  SubscriptionInfo,
  AzureSolutionSettings,
  Inputs,
  Tools,
  Void,
  FunctionRouter,
  OptionItem,
  Solution,
  ProjectConfig,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import * as error from "./error";
import {
  fetchCodeZip,
  saveFilesRecursively,
} from "../common/tools";
import {
  CoreQuestionNames,
  ProjectNamePattern,
  QuestionAppName,
  QuestionRootFolder,
  QuestionSelectSolution,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionYes,
  ScratchOrSampleSelect,
} from "./question";
import * as jsonschema from "jsonschema";
import AdmZip from "adm-zip";
import { TeamsAppSolution } from "../plugins";
export * from "./error";
import { hooks } from "@feathersjs/hooks";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { QuestionModelMW } from "./middleware/question";
import { ConfigWriterMW } from "./middleware/configWriter";
import { ContextLoaderMW } from "./middleware/contextLoader";
import { ProjectCheckerMW } from "./middleware/projectChecker";
import { ConcurrentLockerMW } from "./middleware/concurrentLocker";
import { SolutionLoaderMW } from "./middleware/solutionLoader";
import { InvalidProjectError } from "./error";
 
 
export class FxCore implements Core {
  
  tools: Tools;

  solution:Solution = new TeamsAppSolution();

  ctx?: SolutionContext;

  constructor(tools: Tools) { 
    this.tools = tools;
  }
  
  @hooks([ErrorHandlerMW, ContextLoaderMW, QuestionModelMW, ConfigWriterMW])
  async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
    const folder = inputs[QuestionRootFolder.name] as string;
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    if (scratch === ScratchOptionNo.id) {
      const samples = inputs[CoreQuestionNames.Samples] as OptionItem;
      if (samples && samples.data && folder) {
        const url = samples.data as string;
        const sampleId = samples.id;
        const sampleAppPath = path.resolve(folder, sampleId);
        if (
          (await fs.pathExists(sampleAppPath)) &&
          (await fs.readdir(sampleAppPath)).length > 0
        ) {
          return err(
            new UserError(
              error.CoreErrorNames.ProjectFolderExist,
              `Path ${sampleAppPath} alreay exists. Select a different folder.`,
              error.CoreSource
            )
          );
        }
        const progress = this.tools.dialog.createProgressBar("Fetch sample app", 2);
        progress.start();
        try {
          progress.next(`Downloading from '${url}'`);
          const fetchRes = await fetchCodeZip(url);
          progress.next("Unzipping the sample package");
          if (fetchRes !== undefined) {
            await saveFilesRecursively(new AdmZip(fetchRes.data), sampleId, folder);

            if (inputs.platform === Platform.VSCode) {
              this.tools.dialog?.communicate(
                new DialogMsg(DialogType.Ask, {
                  type: QuestionType.UpdateGlobalState,
                  description: "openSampleReadme",
                })
              );
            }
            return ok(path.join(folder, sampleId));
          } else { 
            return err(error.DownloadSampleFail());
          }
        } finally {
          progress.end();
        } 
      }
    }

    const appName = inputs[QuestionAppName.name] as string;
    if (undefined === appName)
      return err(
        new UserError(error.CoreErrorNames.InvalidInput, `App Name is empty`, error.CoreSource)
      );

    const validateResult = jsonschema.validate(appName, {
      pattern: ProjectNamePattern,
    });
    if (validateResult.errors && validateResult.errors.length > 0) {
      return err(
        new UserError(
          error.CoreErrorNames.InvalidInput,
          `${validateResult.errors[0].message}`,
          error.CoreSource
        )
      );
    }

    const projectPath = path.join(folder, appName);
    const folderExist = await fs.pathExists(projectPath);
    if (folderExist) {
      return err(
        new UserError(
          error.CoreErrorNames.ProjectFolderExist,
          `Project folder exsits:${projectPath}`,
          error.CoreSource
        )
      );
    }

    inputs.projectPath = projectPath;
    this.ctx!.root = projectPath;
    this.ctx!.answers = inputs;
    this.ctx!.projectSettings!.appName = appName;
  
    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath,`.${ConfigFolderName}`));

    
    const createResult = await this.createBasicFolderStructure(inputs);
    if (createResult.isErr()) {
      return err(createResult.error);
    }

    //solution load (hardcode)
    this.solution = new TeamsAppSolution();
    this.ctx!.projectSettings!.solutionSettings!.name = this.solution.name;
    
    const createRes = await this.solution.create(this.ctx!);
    if (createRes.isErr()) {
      return createRes;
    } 

    const scaffoldRes = await this.solution.scaffold(this.ctx!);
    if (scaffoldRes.isErr()) {
      return scaffoldRes;
    } 
  
    if (inputs.platform === Platform.VSCode) {
      await this.tools.dialog?.communicate(
        new DialogMsg(DialogType.Ask, {
          type: QuestionType.UpdateGlobalState,
          description: "openReadme",
        })
      );
    }
    return ok(projectPath);
  }
   
  @hooks([ErrorHandlerMW, ProjectCheckerMW, ConcurrentLockerMW, SolutionLoaderMW, ContextLoaderMW, QuestionModelMW, ConfigWriterMW])
  async provisionResources(inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await this.solution!.provision(this.ctx!);
  }
  
  @hooks([ErrorHandlerMW, ProjectCheckerMW, ConcurrentLockerMW, SolutionLoaderMW, ContextLoaderMW, QuestionModelMW, ConfigWriterMW])
  async deployArtifacts(inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await this.solution!.deploy(this.ctx!);
  }
  @hooks([ErrorHandlerMW, ProjectCheckerMW, ConcurrentLockerMW, SolutionLoaderMW, ContextLoaderMW, QuestionModelMW, ConfigWriterMW])
  async localDebug(inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await this.solution!.localDebug(this.ctx!);
  } 
  @hooks([ErrorHandlerMW, ProjectCheckerMW, ConcurrentLockerMW, SolutionLoaderMW, ContextLoaderMW, QuestionModelMW, ConfigWriterMW])
  async publishApplication(inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await this.solution!.publish(this.ctx!);
  } 

  @hooks([ErrorHandlerMW, ProjectCheckerMW, ConcurrentLockerMW, SolutionLoaderMW, ContextLoaderMW, QuestionModelMW, ConfigWriterMW])
  async executeUserTask(func: Func, inputs: Inputs) :  Promise<Result<unknown, FxError>>{
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0 && this.solution && this.solution.executeUserTask) {
      return await this.solution.executeUserTask(func, this.ctx!);
    }
    return err(
      returnUserError(
        new Error(`executeUserTaskRouteFailed:${JSON.stringify(func)}`),
        error.CoreSource,
        error.CoreErrorNames.executeUserTaskRouteFailed
      )
    );
  }
  
  async buildArtifacts(inputs: Inputs) : Promise<Result<Void, FxError>>{
     throw error.TaskNotSupportError;
  }
  async createEnv (systemInputs: Inputs) : Promise<Result<Void, FxError>>{
    throw error.TaskNotSupportError;
  }
  async removeEnv (systemInputs: Inputs) : Promise<Result<Void, FxError>>{
    throw error.TaskNotSupportError;
  }
  async switchEnv (systemInputs: Inputs) : Promise<Result<Void, FxError>>{
    throw error.TaskNotSupportError;
  }
  
  @hooks([ErrorHandlerMW, SolutionLoaderMW, ContextLoaderMW, ConfigWriterMW])
  async getQuestions(task: Stage, inputs: Inputs) : Promise<Result<QTreeNode | undefined, FxError>> {
    return await this._getQuestions(task, inputs, this.ctx);
  }

  @hooks([ErrorHandlerMW, SolutionLoaderMW, ContextLoaderMW, ConfigWriterMW])
  async getQuestionsForUserTask(func: FunctionRouter, inputs: Inputs) : Promise<Result<QTreeNode | undefined, FxError>>{
    return await this._getQuestionsForUserTask(func, inputs, this.ctx);
  }
  @hooks([ErrorHandlerMW, ContextLoaderMW])
  async getProjectConfig(inputs: Inputs): Promise<Result<ProjectConfig|undefined, FxError>>{
    if(inputs.projectPath)
      return ok({
        settings: this.ctx?.projectSettings,
        config: this.ctx?.config
      });
    else return ok(undefined);
  }

  @hooks([ErrorHandlerMW, ContextLoaderMW, ConfigWriterMW])
  async setSubscriptionInfo(inputs: Inputs) :Promise<Result<Void, FxError>>{
    if(this.ctx && this.ctx.config && this.ctx.config.get("solution")){
      if(inputs.tenantId)
        this.ctx!.config.get("solution")?.set("tenantId",inputs.tenantId);
      else 
        this.ctx!.config.get("solution")?.delete("tenantId");
      if(inputs.subscriptionId)
        this.ctx!.config.get("solution")?.set("subscriptionId",inputs.subscriptionId);
      else 
        this.ctx!.config.get("solution")?.delete("subscriptionId");
      return ok(Void);
    }
    return err(InvalidProjectError);
  }
 
  @hooks([ErrorHandlerMW])
  async _getQuestionsForUserTask(func: FunctionRouter, inputs: Inputs, ctx?:SolutionContext) : Promise<Result<QTreeNode | undefined, FxError>>{
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (namespace && "" !== namespace && array.length > 0 && this.solution && this.solution.getQuestionsForUserTask) {
      this.ctx!.answers = inputs;
      const res = await this.solution.getQuestionsForUserTask!(func, ctx!);
      if (res.isOk()) {
        if (res.value) {
          const node = res.value.trim();
          return ok(node);
        }
      }
      return res;
    }
    return err(
      returnUserError(
        new Error(`getQuestionsForUserTaskRouteFailed:${JSON.stringify(func)}`),
        error.CoreSource,
        error.CoreErrorNames.getQuestionsForUserTaskRouteFailed
      )
    );
  }
  @hooks([ErrorHandlerMW])
  async _getQuestions(stage: Stage, inputs: Inputs, ctx?:SolutionContext): Promise<Result<QTreeNode | undefined, FxError>> {
    const node = new QTreeNode({ type: "group" });
    if (stage === Stage.create) {
      
      const scratchSelectNode = new QTreeNode(ScratchOrSampleSelect(inputs.platform === Platform.CLI));
      node.addChild(scratchSelectNode);

      const scratchNode = new QTreeNode({ type: "group" });
      scratchNode.condition = { equals: ScratchOptionYes.id };
      scratchSelectNode.addChild(scratchNode);

      const sampleNode = new QTreeNode(SampleSelect);
      sampleNode.condition = { equals: ScratchOptionNo.id };
      scratchSelectNode.addChild(sampleNode);

      //make sure that global solutions are loaded
      const solutionNames: string[] = ["fx-solution-azure"];
      const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
      selectSolution.staticOptions = solutionNames;
      const solutionSelectNode = new QTreeNode(selectSolution);
      scratchNode.addChild(solutionSelectNode);
      for (const v of [this.solution!]) {
        if (v.getQuestions) {
          const res = await v.getQuestions(stage, ctx!);
          if (res.isErr()) return res;
          if (res.value) {
            const solutionNode = res.value as QTreeNode;
            solutionNode.condition = { equals: v.name };
            if (solutionNode.data) solutionSelectNode.addChild(solutionNode);
          }
        }
      }

      scratchNode.addChild(new QTreeNode(QuestionRootFolder));
      scratchNode.addChild(new QTreeNode(QuestionAppName));
      sampleNode.addChild(new QTreeNode(QuestionRootFolder));
    } else if (this.solution) {
      const res = await this.solution.getQuestions(stage, ctx!);
      if (res.isErr()) return res;
      if (res.value) {
        const child = res.value as QTreeNode;
        if (child.data) node.addChild(child);
      }
    }
    return ok(node.trim());
  }

  private async createBasicFolderStructure(inputs: Inputs): Promise<Result<null, FxError>> {
    try {
      const appName = inputs[QuestionAppName.name] as string;
      await fs.writeFile(
        path.join(inputs.projectPath!,`package.json`),
        JSON.stringify(
          {
            name: appName,
            version: "0.0.1",
            description: "",
            author: "",
            scripts: {
              test: "echo \"Error: no test specified\" && exit 1",
            },
            license: "MIT",
          },
          null,
          4
        )
      );
      await fs.writeFile(
        path.join(inputs.projectPath!,`.gitignore`),
        `node_modules\n/.${ConfigFolderName}/*.env\n/.${ConfigFolderName}/*.userdata\n.DS_Store`
      );
    } catch (e) {
      return err(error.WriteFileError(e));
    }
    return ok(null);
  }
} 