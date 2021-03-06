// tslint:disable: no-unused-expression
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chai from 'chai';
import { API } from '../api/API';
import ChatClient from '../chat/ChatClient';
import { autoConnect } from '../AutoConnect';

chai.should();

suite.only('AutoConnect Tests', function() {
  let fakeState: vscode.Memento;
  let fakeWorkspaceConfiguration: vscode.WorkspaceConfiguration;
  let fakeChatClient: ChatClient;
  let getConfigurationStub: sinon.SinonStub<[(string|undefined)?,(vscode.Uri|null|undefined)?], vscode.WorkspaceConfiguration>;
  let getIsStreamActiveStub: sinon.SinonStub<[], Promise<boolean>>;
  let toggleChatStub: sinon.SinonStub<[], void>;

  suiteSetup(function() {
    const themerConfig: { [key: string]: any } = {
      "autoConnect": false
    };

    const stateValues: { [key: string]: any } = {
      isStreaming: false
    };

    fakeState = {
      get(key: string): any {
        return stateValues[key];
      },
      update(key: string, value: any) {
        stateValues[key] = value;
        return Promise.resolve();
      }
    };

    fakeChatClient = new ChatClient(fakeState);

    fakeWorkspaceConfiguration = {
      get<T>(section: string, defaultValue?: T): T | undefined {
        return themerConfig[section] || defaultValue;
      },
      has(section: string): boolean {
        return Object.keys(themerConfig).some(c => c === section);
      },
      inspect(section: string) {
        return undefined;
      },
      update<T>(section: string, value: T, configurationTarget?: vscode.ConfigurationTarget | boolean) {
        themerConfig[section] = value;
        return Promise.resolve();
      }
    };

    getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration')
      .returns(fakeWorkspaceConfiguration);

    getIsStreamActiveStub = sinon.stub(API, 'getStreamIsActive')
      .callsFake((): Promise<boolean> => Promise.resolve(fakeState.get<boolean>("isStreaming") || false));

    toggleChatStub = sinon.stub(fakeChatClient, 'toggleChat').callsFake(() => {});
  });

  suiteTeardown(function() {
    getConfigurationStub.restore();
    getIsStreamActiveStub.restore();
  });

  setup(async function() {
    await fakeWorkspaceConfiguration.update("autoConnect", false);
    await fakeState.update("isStreaming", false);
    getConfigurationStub.resetHistory();
    getIsStreamActiveStub.resetHistory();
    toggleChatStub.resetHistory();
  });

  test(`AutoConnect should not check API; autoconnect disabled`, async function() {
    await autoConnect(fakeChatClient);
    getConfigurationStub.calledOnce.should.be.true;
    getIsStreamActiveStub.calledOnce.should.be.false;
  });

  test(`AutoConnect should check API but should not connect; not streaming`, async function() {    
    await fakeWorkspaceConfiguration.update("autoConnect", true);
    await autoConnect(fakeChatClient);
    getConfigurationStub.calledOnce.should.be.true;
    getIsStreamActiveStub.calledOnce.should.be.true;
    toggleChatStub.calledOnce.should.be.false;
  });

  test(`AutoConnect should connect; streaming`, async function() {
    await fakeWorkspaceConfiguration.update('autoConnect', true);
    await fakeState.update("isStreaming", true);
    await autoConnect(fakeChatClient);
    toggleChatStub.calledOnce.should.be.true;
  });
});