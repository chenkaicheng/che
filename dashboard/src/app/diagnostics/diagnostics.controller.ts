/*
 * Copyright (c) 2015-2017 Codenvy, S.A.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *   Codenvy, S.A. - initial API and implementation
 */
'use strict';
import {DiagnosticsWebsocketWsMaster} from './test/diagnostics-websocket-wsmaster.factory';
import {DiagnosticCallback} from './diagnostic-callback';
import {DiagnosticsWorkspaceStartCheck} from './test/diagnostics-workspace-start-check.factory';
import {CheWebsocket} from '../../components/api/che-websocket.factory';
import {DiagnosticsRunningWorkspaceCheck} from './test/diagnostics-workspace-check-workspace.factory';
import {DiagnosticPart} from './diagnostic-part';
import {DiagnosticPartState} from './diagnostic-part-state';

/**
 * @ngdoc controller
 * @name diagnostics.controller:DiagnosticsController
 * @description This class is handling the controller for the diagnostics page
 * @author Florent Benoit
 */
export class DiagnosticsController {

  /**
   * Promise service handling.
   */
  private $q: ng.IQService;

  /**
   * Log service.
   */
  private $log: ng.ILogService;

  /**
   * Lodash utility.
   */
  private lodash: any;

  /**
   * Instance of checker for websockets
   */
  private diagnosticsWebsocketWsMaster : DiagnosticsWebsocketWsMaster;

  /**
   * Instance of checker for workspace
   */
  private diagnosticsWorkspaceStartCheck : DiagnosticsWorkspaceStartCheck;

  /**
   * Che Websocket library.
   */
  private cheWebsocket : CheWebsocket;

  /**
   * Angular timeout service.
   */
  private $timeout : ng.ITimeoutService;

  /**
   * Shared Map across all parts.
   */
  private sharedMap : Map<string, any>;

  /**
   * Reference to the diagnostic workspace checker.
   */
  private diagnosticsRunningWorkspaceCheck : DiagnosticsRunningWorkspaceCheck;

  /**
   * List of all parts.
   */
  private parts : Array<DiagnosticPart>;

  /**
   * Link to the workspace master part
   */
  private wsMasterPart : DiagnosticPart;

  /**
   * Link to the workspace agent part
   */
  private wsAgentPart : DiagnosticPart;

  /**
   * Alias for the current part being tested
   */
  private currentPart : DiagnosticPart;

  /**
   * Allow to turn on/off details
   */
  private showDetails: boolean = false;

  /**
   * Global state
   */
  private state : DiagnosticPartState;

  /**
   * Text to be displayed as global status
   */
  private globalStatusText : string;

  /**
   * Default constructor that is using resource
   * @ngInject for Dependency injection
   */
  constructor($log: ng.ILogService, $q: ng.IQService, lodash: any,
              $timeout : ng.ITimeoutService,
              diagnosticsWebsocketWsMaster : DiagnosticsWebsocketWsMaster,
              cheWebsocket: CheWebsocket,
              diagnosticsRunningWorkspaceCheck : DiagnosticsRunningWorkspaceCheck,
              diagnosticsWorkspaceStartCheck : DiagnosticsWorkspaceStartCheck) {
    this.$q = $q;
    this.$log = $log;
    this.lodash = lodash;
    this.$timeout = $timeout;
    this.diagnosticsWebsocketWsMaster = diagnosticsWebsocketWsMaster;
    this.diagnosticsWorkspaceStartCheck = diagnosticsWorkspaceStartCheck;
    this.diagnosticsRunningWorkspaceCheck = diagnosticsRunningWorkspaceCheck;
    this.parts = new Array<DiagnosticPart>();
    this.cheWebsocket = cheWebsocket;
    this.sharedMap = new Map<string, any>();
    this.state = DiagnosticPartState.READY;
    this.globalStatusText = 'Ready to start';

    this.wsMasterPart = new DiagnosticPart();
    this.wsMasterPart.icon = 'fa fa-cube';
    this.wsMasterPart.title = 'Server Tests';
    this.wsMasterPart.state = DiagnosticPartState.READY;
    this.wsMasterPart.subtitle = 'Connectivity checks on Workspace Master';

    this.wsAgentPart = new DiagnosticPart();
    this.wsAgentPart.icon = 'fa fa-cubes';
    this.wsAgentPart.title = 'Workspace Tests';
    this.wsAgentPart.state = DiagnosticPartState.READY;
    this.wsAgentPart.subtitle = 'Connectivity checks on Workspace Agents';
  }

  /**
   * Start the tests.
   */
  public start() : void {
    this.sharedMap.clear();
    this.globalStatusText = 'Running Tests';
    this.state = DiagnosticPartState.IN_PROGRESS;

    this.parts.length = 0;
    this.parts.push(this.wsMasterPart);
    this.parts.push(this.wsAgentPart);
    this.parts.forEach((part) => {
      part.clear();
    });

    this.currentPart = this.wsMasterPart;


    // First check websocket on workspace master
    this.checkWorkspaceMaster().then(() => {
      return this.checkWorkspaceAgent();
    }).then(() => {
      return this.$q.all([this.checkWorkspaceCheck(), this.checkWebSocketWsAgent()]);
    }).then(()=> {
      this.globalStatusText = 'Successfully Tested';
      this.state = DiagnosticPartState.SUCCESS;
    }).catch(error => {
      this.globalStatusText = 'Finished with error';
      this.state = DiagnosticPartState.ERROR;
      }
    )
  }

  /**
   * Build a new callback item
   * @param text the text to set in the callback
   * @param diagnosticPart the diagnostic part
   * @returns {DiagnosticCallback} the newly callback
   */
  public newItem(text: string, diagnosticPart : DiagnosticPart) : DiagnosticCallback {
    let callback : DiagnosticCallback = new DiagnosticCallback(this.$q, this.cheWebsocket, this.$timeout, text, this.sharedMap, this, diagnosticPart);
    diagnosticPart.addCallback(callback);
    return callback;
  }

  /**
   * Sets the details part.
   * @param part the part to be displayed for the details
   */
  public setDetailsPart(part : DiagnosticPart) : void {
    this.currentPart = part;
  }

  /**
   * Checks the workspace master.
   * @returns {ng.IPromise}
   */
  public checkWorkspaceMaster() : ng.IPromise {
    this.currentPart = this.wsMasterPart;

    this.wsMasterPart.state = DiagnosticPartState.IN_PROGRESS;
    let promiseWorkspaceMaster : ng.IPromise = this.diagnosticsWebsocketWsMaster.start(this.newItem('Test Websocket', this.wsMasterPart));
    promiseWorkspaceMaster.then(() => {
      this.wsMasterPart.state = DiagnosticPartState.SUCCESS;
    }).catch(error => {
      this.wsMasterPart.state = DiagnosticPartState.ERROR;
    });

    return promiseWorkspaceMaster;
  }

  /**
   * Checks the workspace agent.
   * @returns {ng.IPromise}
   */
  public checkWorkspaceAgent() : ng.IPromise {
    this.currentPart = this.wsAgentPart;

    this.wsAgentPart.state = DiagnosticPartState.IN_PROGRESS;
    let promiseWorkspaceAgent : ng.IPromise = this.diagnosticsWorkspaceStartCheck.start(this.newItem('Test Workspace creation', this.wsAgentPart));
    promiseWorkspaceAgent.then(() => {
      this.wsAgentPart.state = DiagnosticPartState.SUCCESS;
    }).catch(error => {
      this.wsAgentPart.state = DiagnosticPartState.ERROR;
    });

    return promiseWorkspaceAgent;
  }

  /**
   * Check the REST API on ws agent
   * @returns {ng.IPromise}
   */
  public checkWorkspaceCheck() : ng.IPromise {
    return this.diagnosticsRunningWorkspaceCheck.checkWsAgent(this.newItem('REST Call on Workspace Agent', this.wsAgentPart))
  }

  /**
   * Check the websockets on ws agent
   * @returns {ng.IPromise}
   */
  public checkWebSocketWsAgent() : ng.IPromise {
    return this.diagnosticsRunningWorkspaceCheck.checkWebSocketWsAgent(this.newItem('Websocket on Workspace Agent', this.wsAgentPart))
  }

  /**
   * Allow to toggle details
   * @returns {ng.IPromise}
   */
  public toggleDetails() : void {
    this.showDetails = !this.showDetails;
  }

  /**
   * Checks the state of the controller
   * @returns {boolean} true if state is READY
   */
  public isReady() : boolean {
    return DiagnosticPartState.READY === this.state;
  }

  /**
   * Checks the state of the controller
   * @returns {boolean} true if state is IN_PROGRESS
   */
  public isInProgress() : boolean {
    return DiagnosticPartState.IN_PROGRESS === this.state;
  }

  /**
   * Checks the state of the controller
   * @returns {boolean} true if state is SUCCESS
   */
  public isSuccess() : boolean {
    return DiagnosticPartState.SUCCESS === this.state;
  }

  /**
   * Checks the state of the controller
   * @returns {boolean} true if state is FAILURE
   */
  public isFailure() : boolean {
    return DiagnosticPartState.FAILURE === this.state;
  }

  /**
   * Checks the state of the controller
   * @returns {boolean} true if state is ERROR
   */
  public isError() : boolean {
    return DiagnosticPartState.ERROR === this.state;
  }

}
