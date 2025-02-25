// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/****************************************************************************************
 *                            NOTICE: AUTO-GENERATED                                    *
 ****************************************************************************************
 * This file is automatically generated by script "./src/question/generator.ts".        *
 * Please don't manually change its contents, as any modifications will be overwritten! *
 ***************************************************************************************/

import { CLICommandOption, CLICommandArgument } from "@microsoft/teamsfx-api";

export const PermissionListOptions: CLICommandOption[] = [
  {
    name: "teams-manifest-file",
    questionName: "manifest-path",
    type: "string",
    shortName: "t",
    description:
      "Specifies the Microsoft Teams app manifest template file path, it can be either absolute path or relative path to project root folder, defaults to './appPackage/manifest.json'",
    default: "./appPackage/manifest.json",
  },
  {
    name: "env",
    type: "string",
    description: "Specifies the environment name for the project.",
  },
  {
    name: "aad-manifest-file",
    questionName: "manifest-file-path",
    type: "string",
    shortName: "a",
    description:
      "Specifies the Microsoft Entra app manifest file path, can be either absolute path or relative path to project root folder.",
    default: "./aad.manifest.json",
  },
];
export const PermissionListArguments: CLICommandArgument[] = [];
