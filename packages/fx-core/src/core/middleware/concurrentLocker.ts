// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { HookContext, NextFunction, Middleware } from "@feathersjs/hooks"; 
import { ConfigFolderName, err, Inputs, Platform } from "@microsoft/teamsfx-api";
import * as path from "path";
import { ConcurrentError } from "../error";

const lockfile = require("proper-lockfile"); 

export const ConcurrentLockerMW: Middleware = async (
  ctx: HookContext,
  next: NextFunction
) => {
  const inputs = ctx.arguments[ctx.arguments.length - 1] as Inputs;
  const ignoreLock = !inputs || !inputs.projectPath || inputs.ignoreLock === true || inputs.platform === Platform.VS; 
  if(ignoreLock === false){
    const lf = path.join(inputs.projectPath!,`.${ConfigFolderName}`);
    await lockfile
      .lock(lf)
      .then(async () => {
        try{
          await next();
        }
        catch(e){
          ctx.result = err(e);
        }
        finally{
          lockfile.unlock(lf);
        }
      })
      .catch((e: Error) => {
        console.log(e);
        ctx.result = err(ConcurrentError);
        return;
      });
  }
  else {
    await next();
  }
};
