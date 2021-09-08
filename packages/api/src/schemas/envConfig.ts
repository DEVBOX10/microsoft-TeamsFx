/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * The schema of TeamsFx configuration.
 */
export interface EnvConfig {
  $schema?: string;
  /**
   * The Azure resource related configuration.
   */
  azure?: {
    /**
     * The default subscription to provision Azure resources.
     */
    subscriptionId?: string;
    /**
     * The default resource group of Azure resources.
     */
    resourceGroupName?: string;
  };
  /**
   * Existing bot AAD app configuration.
   */
  bot?: {
    /**
     * The id of existing bot AAD app.
     */
    appId?: string;
    /**
     * The password of existing bot AAD app.
     */
    appPassword?: string;
  };
  /**
   * The Teams App manifest related configuration.
   */
  manifest: {
    description?: string;
    /**
     * Configs to customize the Teams app manifest.
     */
    values: {
      /**
       * Teams app name.
       */
      appName: {
        /**
         * A short display name for teams app.
         */
        short: string;
        /**
         * The full name for teams app.
         */
        full?: string;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  /**
   * Skip to add user during SQL provision.
   */
  skipAddingSqlUser?: boolean;
}
