// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import * as path from "path";
import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks";
import { err,  ConfigFolderName} from "fx-api";
import * as error from "../error";
import { CoreContext } from "../context";
import { TeamsSolutionSetting } from "../../plugins/solution/fx-solution";
 
/**
 * This middleware will help to persist configs if necessary.
 */
export const ConfigWriterMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {

  try{
    await next();
  }
  finally{
    if(ctx.arguments[0]){
      const coreCtx: CoreContext = ctx.arguments[0] as CoreContext;

      // if(coreCtx.solutionContext){
      //   coreCtx.projectSetting.solutionSetting = coreCtx.solutionContext.solutionSetting;
      //   coreCtx.projectSetting.solutionSetting = coreCtx.solutionContext.solutionSetting;
      // }
     
      try { 
        const configFolder = path.join(coreCtx.projectPath,`.${ConfigFolderName}`);
        await fs.writeFile(path.join(configFolder,"setting.json"), JSON.stringify(coreCtx.projectSetting, null, 4)  );
        await fs.writeFile(path.join(configFolder,"state.json"), JSON.stringify(coreCtx.projectState, null, 4)  );
        const envName = coreCtx.projectSetting.currentEnv;
        // provision,deploy template
        const resources = coreCtx.projectSetting.solutionSetting.resourcePlugins;
        //only create project need to persist template files
        if(ctx.method === "createProject" && resources && resources.length > 0){
          for(const resource of resources){
            if(coreCtx.provisionTemplates)
              await fs.writeFile(path.join(configFolder, `${resource}.provision.tpl.json`), JSON.stringify(coreCtx.provisionTemplates[resource], null, 4));
            if(coreCtx.deployTemplates)
             await fs.writeFile(path.join(configFolder, `${resource}.deploy.tpl.json`), JSON.stringify(coreCtx.deployTemplates[resource], null, 4));
          }
        }
    
        //env.userdata
        if(coreCtx.resourceInstanceValues)
          await fs.writeFile(path.join(configFolder,`${envName}.userdata.json`), JSON.stringify(coreCtx.resourceInstanceValues, null, 4));
        if(coreCtx.stateValues)
          await fs.writeFile(path.join(configFolder,`${envName}.state.json`), JSON.stringify(coreCtx.stateValues, null, 4));
      } catch (e) {
        ctx.result = err(error.WriteFileError(e));
      }
    }
  }
};
