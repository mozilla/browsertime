# New-style script bundles:

A new-style script bundle allows the user to write a script that executes in an environment that meets certain requirements. The script writer specifies the requirements for their script and the browser will meet those requirements before executing the script's functionality. If the requirements cannot be met, then the script's functionality will not be executed.

A new-style script bundle is defined in a file with a new-style script bundle object that is assigned to `module.exports`. A new-style script bundle object has the following keys:

  * *requires*: An object whose keys define the requirements for executing this script object's functionality.
  * *pre*: A possibly asynchronous function that configures the browser and/or test environment to meet the preconditions of the data collection function, `collect`. The function will be invoked with no parameters. If the function returns a promise, the promise (and its children promises, if any) will be resolved. The *pre* function may return `false` to disable execution of the *collect* and *post* functions from this new-style script bundle. All other return values will be discarded.
  * *collect*: A possibly asynchronous function that actually performs the script object's data collection. The function will be invoked with no parameters. If the function is asynchronous, it must return a `Promise`. The value `resolve`d by that promise is serialized into browsertime's result output. If the function is not asynchronous, any value returned by this function is serialized into browsertime's result output.
  * *post*: A possibly asynchronous function that restores the browser and/or test environment to its status before executing this script bundle. The function will be invoked with no parameters. If the function returns a `Promise`, it (and its children promises, if any) will be resolved.

At the moment, browsertime only supports one requirement in new-style script objects, the `privilege` requirement. If the `privilege` requirement is set to `true`, the new-style script object's functionality will execute with access to the browser's privileged APIs (which is currently only available in Firefox). If the browser cannot guarantee that the script can execute with access to the browser's privileged API (for whatever reason), it will not be executed.

For example,

    module.exports = {
        requires: { privilege: true },
        collect: function() {
            const { AppConstants } = ChromeUtils.import(
                'resource://gre/modules/AppConstants.jsm'
            );
            return AppConstants;
        }
    };

defines a new-style script bundle that requires access to the browser's privileged API in order to perform its measurements.

The equivalent functionality can be accomplished asynchronously:

    module.exports = {
        requires: { privilege: true },
        collect: async function() {
                return new Promise(resolve => {
                        const { AppConstants } = ChromeUtils.import(
                                'resource://gre/modules/AppConstants.jsm'
                        );
                        resolve(AppConstants);
                });
        }
    };

As an example of the utility of pre/post functionality in a new-style script
bundle, here is an example of how to use `ChromeUtils.collectPerfStats`:

    module.exports = {
        requires: { privilege: true },
        pre: function() {
                ChromeUtils.setPerfStatsCollectionMask(255);
        },
        collect: async function() {
                const stats = await ChromeUtils.collectPerfStats();
                return new Promise(resolve => {
                        resolve(JSON.parse(stats));
                });
        }
    };
