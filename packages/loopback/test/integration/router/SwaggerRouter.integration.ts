// Copyright IBM Corp. 2013,2017. All Rights Reserved.
// Node module: loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {SwaggerRouter} from '../../../lib/router/SwaggerRouter';
import * as http from 'http';
import * as request from 'request-promise';
import { FullRequestResponse } from './../../support/FullRequestResponse';
import * as bluebird from 'bluebird';
import {expect} from 'testlab';
import {listen} from '../../support/util';
import {OpenApiSpec, ParameterObject} from '../../../lib/router/OpenApiSpec';
import {givenOpenApiSpec} from '../../support/OpenApiSpecBuilder';

describe('SwaggerRouter', () => {
  beforeEach(givenRouter);

  context('with a simple HelloWorld controller', () => {
    beforeEach(function setupHelloController() {
      const spec = givenOpenApiSpec()
        .withOperationReturningString('get', '/hello', 'greet')
        .build();

      class HelloController {
        public async greet(): Promise<string> {
          return 'Hello world!';
        }
      }

      givenControllerClass(HelloController, spec);
    });

    it('handles simple "GET /hello" requests', async () => {
      const response = await requestEndpoint('GET', '/hello');
      expect(response.statusCode).to.equal(200);
      expect(response.body).to.equal('Hello world!', 'body');
    });
  });

  context('with a controller with operations at different paths/verbs', () => {
    beforeEach(function setupHelloController() {
      const spec = givenOpenApiSpec()
        .withOperationReturningString('get', '/hello', 'hello')
        .withOperationReturningString('get', '/bye', 'bye')
        .withOperationReturningString('post', '/hello', 'postHello')
        .build();

      class HelloController {
        public async hello(): Promise<string> {
          return 'hello';
        }

        public async bye(): Promise<string> {
          return 'bye';
        }

        public async postHello(): Promise<string> {
          return 'hello posted';
        }
      }

      givenControllerClass(HelloController, spec);
    });

    it('executes hello() for "GET /hello"', async () => {
      const response = await requestEndpoint('GET', '/hello');
      expect(response.body).to.equal('hello');
    });

    it('executes bye() for "GET /bye"', async () => {
      const response = await requestEndpoint('GET', '/bye');
      expect(response.body).to.equal('bye');
    });

    it('executes postHello() for "POST /hello', async () => {
      const response = await requestEndpoint('POST', '/hello');
      expect(response.body).to.equal('hello posted');
    });

    it('returns 404 for path not handled', async () => {
      const response = await requestEndpoint('GET', '/unknown-path');
      expect(response.statusCode).to.equal(404);
    });

    it('returns 404 for verb not handled', async () => {
      const response = await requestEndpoint('POST', '/bye');
      expect(response.statusCode).to.equal(404);
    });
  });

context('with an operation echoing a string parameter from query', () => {
    beforeEach(function setupEchoController() {
      const spec = givenOpenApiSpec()
        .withOperation('get', '/echo', {
          'x-operation-name': 'echo',
          parameters: [
            // the type cast is not required, but improves Intellisense
            <ParameterObject> {
              name: 'msg',
              in: 'query',
              type: 'string',
            },
          ],
          responses: {
            '200': {
              type: 'string',
            },
          },
        })
        .build();

      class EchoController {
        public async echo(msg: string): Promise<string> {
          return msg;
        }
      }

      givenControllerClass(EchoController, spec);
    });

    it('returns "hello" for "?msg=hello"', async () => {
      const response = await requestEndpoint('GET', '/echo?msg=hello');
      expect(response.body).to.equal('hello');
    });

    it('url-decodes the parameter value', async () => {
      const response = await requestEndpoint('GET', '/echo?msg=hello%20world');
      expect(response.body).to.equal('hello world');
    });

    it('ignores other query fields', async () => {
      const response = await requestEndpoint('GET', '/echo?msg=hello&ignoreKey=ignoreMe');
      expect(response.body).to.equal('hello');
    });
  });

  context('with a path-parameter route', () => {
    beforeEach(givenRouteParamController);

    it('returns "admin" for "/users/admin"', async () => {
      const response = await requestEndpoint('GET', '/users/admin');
      expect(response.body).to.equal('admin');
    });

    function givenRouteParamController() {
      const spec = givenOpenApiSpec()
        .withOperation('get', '/users/{username}', {
          'x-operation-name': 'getUserByUsername',
          parameters: [
            <ParameterObject> {
              name: 'username',
              in: 'path',
              description: 'The name of the user to look up.',
              required: true,
              type: 'string',
            },
          ],
          responses: {
            200: {
              schema: {
                type: 'string',
              },
            },
          },
        })
        .build();

      class RouteParamController {
        public async getUserByUsername(userName: string): Promise<string> {
          return userName;
        }
      }

      givenControllerClass(RouteParamController, spec);
    }
  });

  context('response serialization', () => {
    it('converts object result to a JSON response', async () => {
      const spec = givenOpenApiSpec()
        .withOperation('get', '/object', {
          'x-operation-name': 'getObject',
          responses: {
            '200': { type: 'object' },
          },
        })
        .build();

      class TestController {
        public async getObject(): Promise<Object> {
          return {key: 'value'};
        }
      }

      givenControllerClass(TestController, spec);

      const response = await requestEndpoint('GET', '/object');
      expect(response.statusCode).to.equal(200, 'statusCode');
      expect(response.headers['content-type']).to.match(/^application\/json($|;)/);
      expect(response.body).to.equal('{"key":"value"}', 'body');
    });
  });

  let router: SwaggerRouter;
  function givenRouter() {
    router = new SwaggerRouter();
  }

 function givenControllerClass(ctor: new (...args) => Object, spec: OpenApiSpec) {
   router.controller((req, res) => new ctor(), spec);
 }

  async function requestEndpoint(verb: string, path: string): Promise<FullRequestResponse> {
    const server = http.createServer(router.handler);
    const baseUrl = await listen(server);
    return request({
      baseUrl,
      url: path,
      method: verb,
      simple: false,
      resolveWithFullResponse: true,
    });
  }
});
