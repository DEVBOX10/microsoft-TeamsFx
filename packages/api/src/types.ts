// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { OptionItem , AnswerValue} from "./qm";
import { Platform, VsCodeEnv } from "./constants";
import { LogProvider, TelemetryReporter } from "./utils";
import { UserInterface } from "./ui";

export type ConfigValue =
    | string
    | string[]
    | number
    | number[]
    | boolean
    | boolean[]
    | OptionItem[]
    | OptionItem
    | undefined
    | unknown;
 
// eslint-disable-next-line @typescript-eslint/ban-types
export type Void = {};
export const Void = {};

export  interface Dict<T> {
    [key: string]: T | undefined;
}

export type ResourceTemplate = Dict<string>;

export type ResourceTemplates = Dict<ResourceTemplate>;

export type ResourceConfig = ResourceTemplate;

export type ResourceConfigs = ResourceTemplates;

export type ReadonlyResourceConfig = Readonly<ResourceConfig>;

export type ReadonlyResourceConfigs = Readonly<{
    [k:string]:ReadonlyResourceConfig|undefined;
}>;


/**
 * environment meta data
 */
export interface EnvMeta{
    name:string,
    local:boolean,
    sideloading:boolean
}

export type ResourceInstanceValues = Dict<ConfigValue>;

export type StateValues = Dict<ConfigValue>;

/**
 * project static settings
 */
export interface ProjectSetting extends Dict<ConfigValue>{
    /**
     * id name
     */
    name:string;
    /**
     * display name
     */
    displayName?:string;
    
    /**
     * solution settings
     */
    solutionSetting:SolutionSetting;

    /**
     * environments
     */
    environments: {
        [k : string] : EnvMeta;
    };

    /**
     * current environment name
     */
    currentEnv: string;
}


/**
 * solution settings
 */
export interface SolutionSetting extends Dict<ConfigValue>{
    
    /**
     * solution name
     */
    name:string;

    /**
     * solution display name
     */
    displayName?: string;
    
    /**
     * version
     */
    version:string;

    /**
     * active resource plugin names
     */
    resources:string[];

    /**
     * resource settings map,key is resource name, value is resource settings
     */
    resourceSettings: {
        [k:string]:ResourceSetting
    }
}

export type ResourceSetting = Dict<ConfigValue>;


export interface AzureSolutionSetting extends SolutionSetting{
    capabilities:string[],
    hostType?:string,
    azureResources?:string[]
}

/**
 * project dynamic states
 */
export interface ProjectState extends Dict<ConfigValue>{
    solutionState:SolutionState;
}
 
export interface SolutionState extends Dict<ConfigValue>{
     resourceStates: {
        [k:string]:ResourceState
    }
}

export type ResourceState = Dict<ConfigValue>;

export interface Inputs extends Dict<AnswerValue>{
    projectPath:string;
    platform: Platform;
    vscodeEnv?:VsCodeEnv;
}    

export interface Json{
    [k : string]:unknown;
}

/*
 * Context is env independent
 */
export interface Context {
    /**
     * project folder path, not persist
     */
    projectPath: string;

    /**
     * ui interface
     */
    ui: UserInterface;

    /**
     * log util tool
     */
    logProvider: LogProvider;

    /**
     * telemetry tool
     */
    telemetryReporter: TelemetryReporter;

    /**
     * Static settings
     */
    projectSetting: ProjectSetting; 

    /**
     * Dynamic states
     */
    projectState: ProjectState;
}
 
/**
 * project config model
 */
export interface ProjectConfigs{
    projectSetting: ProjectSetting; 
    projectState: ProjectState;
    provisionTemplates?:ResourceTemplates;
    deployTemplates?: ResourceTemplates;
    provisionConfigs?:ResourceConfigs;
    deployConfigs?: ResourceConfigs;
    resourceInstanceValues?: ResourceInstanceValues;
    stateValues?: StateValues;
}