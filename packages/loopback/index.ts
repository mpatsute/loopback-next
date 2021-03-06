// Copyright IBM Corp. 2013,2017. All Rights Reserved.
// Node module: loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

export {
  Server,
  ServerConfig,
  ServerState,
} from './lib/server';

export {
  Application
} from './lib/application';

export {
  api,
} from './lib/router/metadata'

export * from './lib/router/OpenApiSpec';

export function inject(name: string) {
  return function(target, propoertyNAme, index) {
    // TODO(bajtos, superkhau)
  };
}
