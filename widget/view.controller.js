/* Copyright start
  MIT License
  Copyright (c) 2025 Fortinet Inc
  Copyright end */

'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('playbookDebugger100Ctrl', playbookDebugger100Ctrl);

    playbookDebugger100Ctrl.$inject = ['$scope', 'API', '$http', '$q', 'playbookDebuggerService', '$timeout', '$rootScope', 'CommonUtils'];

  function playbookDebugger100Ctrl($scope, API, $http, $q, playbookDebuggerService, $timeout, $rootScope, CommonUtils) {
    $scope.exportExecutedPlaybook = exportExecutedPlaybook;
    $scope.getPlaybookInterConnection = getPlaybookInterConnection;
    $scope.playbookInterconnectionID = 'dpb-' + CommonUtils.generateUUID();
    $scope.canvasConfig = {
      node_bg_color: '',
      node_text_color: '',
      edge_color: ''
    };
    let playbookConnectionConfig;
    const workflowCollectionData = {
      'type': 'workflow_collections',
      'data': [
        {
          '@context': '/api/3/contexts/WorkflowCollection',
          '@type': 'WorkflowCollection',
          'name': '00 - Playbook Debugger - Exported Playbooks',
          'description': null,
          'visible': true,
          'image': null,
          'uuid': '8816ee5f-1aa5-414b-ada8-a01680b947ff',
          'id': 4474955,
          'createDate': 0,
          'modifyDate': 0,
          'deletedAt': null,
          'importedBy': [],
          'recordTags': [],
          'workflows': []
        }
      ],
      'exported_tags': []
    };

    $scope.$on('popupOpened', function() {
      init();
    })

    function _highlightStep(stepElement) {
      stepElement.style.setProperty('border', '2px solid #22a6af', 'important');
    }

    function _unhighlightStep(stepElement) {
      stepElement.style.border = '';
    }

    function _handleTranslations() {
      let widgetData = {
        name: $scope.config.name,
        version: $scope.config.version
      };
      let widgetNameVersion = widgetUtilityService.getWidgetNameVersion(widgetData);
      if (widgetNameVersion) {
        widgetUtilityService.checkTranslationMode(widgetNameVersion).then(function () {
          $scope.viewWidgetVars = {
            // Create your translating static string variables here
            PLAYBOOK_INTERCONNECTION_ENGINE_TITLE: widgetUtilityService.translate('playbookDebugger.PLAYBOOK_INTERCONNECTION_ENGINE'),
            SEARCH: widgetUtilityService.translate('playbookDebugger.SEARCH'),
            SEARCH_IN_PLAYBOOK_TITLE: widgetUtilityService.translate('playbookDebugger.SEARCH_IN_PLAYBOOK')
          };
        });
      }
      else {
        $timeout(function () {
          cancel();
        }, 100)
      }
    }

    function init() {
      _handleTranslations();
      $scope.searchText = '';
      playbookConnectionConfig = {
        nodes: new vis.DataSet(),
        edges: new vis.DataSet()
      };
      $scope.playbook_interconnection_vis_data = {
        'nodes': playbookConnectionConfig.nodes,
        'edges': playbookConnectionConfig.edges
      }
      $timeout(function() {
        $scope.getPlaybookInterConnection();
      }, 1000);
    }

    $scope.$watch('searchText', function (newVal, old_value) {
      let playbookDesigner = document.querySelector('#designer');
      let playbookConfig = {
        playbookDesigner: playbookDesigner,
        playbookDesignerScope: angular.element(playbookDesigner).scope(),
        pattern: newVal,
        searchType: 'default'
      };
      let highlightedStepUUID = [];
      if(playbookConfig.playbookDesignerScope && playbookConfig.playbookDesignerScope.playbook && playbookConfig.playbookDesignerScope.playbook.steps) {
        let steps = playbookConfig.playbookDesignerScope.playbook.steps;
        for (const step_uuid of Object.keys(steps)) {
          let step = steps[step_uuid];
          let stepArguments = JSON.stringify(step['arguments']);
          const stepElement = playbookConfig.playbookDesigner.querySelector(`#step-${step_uuid}`);
          _unhighlightStep(stepElement);
          
          if(playbookConfig.pattern === '')
            continue;

          if(playbookConfig.searchType === 'default') {
            if(stepArguments.toLowerCase().indexOf(playbookConfig.pattern.toLowerCase()) >= 0) {
              _highlightStep(stepElement);
              highlightedStepUUID.push(step.uuid);
            }
          }
          else if(playbookConfig.searchType === 'case sensitive') {
            if(stepArguments.indexOf(playbookConfig.pattern) >= 0) {
              _highlightStep(stepElement);
              highlightedStepUUID.push(step.uuid);
            }
          }
          else if(playbookConfig.searchType === 'regex') {
            if(stepArguments.match(playbookConfig.pattern)) {
              _highlightStep(stepElement);
              highlightedStepUUID.push(step.uuid);
            }
          }
        }
      }

      const runningPlaybookCtl = document.querySelector('div[data-ng-controller=\'RunningPlaybookCtl\']');
      const runningPlaybookCtlScope = angular.element(runningPlaybookCtl).scope()

      if (runningPlaybookCtlScope) {
        for (const step_uuid of highlightedStepUUID) {
          const stepElement = runningPlaybookCtl.querySelector(`#step-${step_uuid}`);
          _highlightStep(stepElement);
        }
      }
    });

    function _saveToFile(playbook) {
      delete playbook['@context'];
      delete playbook['@id'];
      for (const step of playbook.steps) {
        delete step['@id'];
        step.stepType = step.stepType['@id'];
      }
      for (const route of playbook.routes) {
        delete route['@id'];
      }
      delete playbook['priority'];
      delete playbook['createUser'];
      delete playbook['modifyUser'];

      let workflow_collection = JSON.parse(JSON.stringify(workflowCollectionData));
      workflow_collection['data'][0]['workflows'].push(playbook);

      const jsonString = JSON.stringify(workflow_collection);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const collection = document.createElement('collection');
      collection.href = url;
      collection.download = 'exported_playbook_data.json';
      collection.click();
      window.URL.revokeObjectURL(url);
    }

    function _getStepResultByStepName(steps, stepName) {
      for (const step of steps)
        if (step['name'] === stepName)
          return step;
    }

    function exportExecutedPlaybook() {
      const runningPlaybookCtl = document.querySelector('div[data-ng-controller=\'RunningPlaybookCtl\']');
      const runningPlaybookCtlScope = angular.element(runningPlaybookCtl).scope()

      $http.get(API.API + runningPlaybookCtlScope.activeTab + '?').then(function (response) {
        if(response && response.data) {
          let URL = response.data.template_iri;

          $http.get(URL + '?$relationships=true&$versions=false').then(function (playbookResponse) {
              let playbookData = playbookResponse['data'];
              let get_executed_steps_promise = [];

              for (const step of playbookData['steps']) {
                const executed_step = _getStepResultByStepName(response.data.steps, step.name);
                if (executed_step) {
                  get_executed_steps_promise.push($http.get(API.API + executed_step['@id']));
                }
              }

              $q.all(get_executed_steps_promise).then(function (executed_step_responses) {
                  for (const index in executed_step_responses) {
                    const executedStep = executed_step_responses[index]['data'];
                    const stepTypeName = export_playbook_data['steps'][index]['stepType']['name'];
                    if (stepTypeName === 'SetVariable') {
                      // _step['arguments'] = executed_step['args']; // TODO choose from 1, accept jinja or replace everything?
                      export_playbook_data['steps'][index]['arguments'] = executedStep['result']; // TODO choose from 1, accept jinja or replace everything?
                    }
                    else if (stepTypeName === 'cybersponse.abstract_trigger') {
                      // trigger step
                    }
                    else {
                      export_playbook_data['steps'][index]['arguments']['mock_result'] = executedStep['result'];
                    }
                  }
                  _saveToFile(export_playbook_data);
                })
                .catch(function (_error) {
                  console.debug(_error);
                })
            })
            .catch(function (_response) {

            });
        }
      })
      .catch(function (_response) {

      });
    }

    function get_parent_playbooks(uuid, current_depth = 0, until_depth) {
      var defer = $q.defer();
      if (until_depth && until_depth <= current_depth){
        defer.resolve();
      }
      playbookDebuggerService.getParentPlaybook(uuid).then(function (response) {
          const parent_playbooks = response['hydra:member'];
          let parent_collections = [];
          for (const workflow of parent_playbooks) {
            parent_collections.push(workflow['collection'].split('/').pop());
            playbookConnectionConfig.nodes.update({
              'id': workflow.uuid,
              'label': workflow.name,
              'shape': 'box',
              'level': -(current_depth + 1),
              'color': $scope.canvasConfig.node_bg_color,
              'margin': { top: 10, bottom: 10, left: 10, right: 10 },
              'font': { 'color': $scope.canvasConfig.node_text_color }
            });
            playbookConnectionConfig.edges.update({
              'id': _convertID(workflow.uuid, uuid),
              'from': workflow.uuid,
              'to': uuid,
              'color': {
                  'color': $scope.canvasConfig.edge_color, // Green default edge
                  'highlight': $scope.canvasConfig.edge_color, // Purple when selected
                },
            });
            get_parent_playbooks(workflow.uuid, current_depth + 1, until_depth);
          }
        }).finally(function() {
          defer.resolve();
        })
        .catch(function (error) {
          console.error(error);
        });
        return defer.promise;
    }

    function get_child_playbooks(uuid, current_depth = 0, until_depth) {
      var defer = $q.defer();
      playbookDebuggerService.getChildPlaybook(uuid).then(function(response) {
          playbookConnectionConfig.nodes.update({
            'id': uuid,
            'label': response['data']['name'],
            'shape': 'box',
            'level': current_depth,
            'color': $scope.canvasConfig.node_bg_color,
            'margin': { top: 10, bottom: 10, left: 10, right: 10 },
            'font': { 'color': $scope.canvasConfig.node_text_color }
          });

          if (until_depth && until_depth <= current_depth)
            defer.resolve();

          const steps = response['data']['steps'];
          for (const step of steps) {
            if (step['stepType']['name'] === 'WorkflowReference') {
              const child_playbook_uuid = step['arguments']['workflowReference'].split('/').pop();
              if (!playbookDebuggerService.isValidUUID(child_playbook_uuid)) {
                console.debug(`not a valid uuid4: ${child_playbook_uuid} in playbook ${response['data']['name']}`);
                continue;
              }

              playbookConnectionConfig.nodes.update({
                'id': child_playbook_uuid,
                'label': 'Fetching',
                'shape': 'box',
                'level': current_depth + 1,
                'color': $scope.canvasConfig.node_bg_color,
                'margin': { top: 10, bottom: 10, left: 10, right: 10 },
                'font': { 'color': $scope.canvasConfig.node_text_color }
              });
              playbookConnectionConfig.edges.update({
                'id': _convertID(uuid, child_playbook_uuid),
                'from': uuid,
                'to': child_playbook_uuid,
                'color': {
                  'color': $scope.canvasConfig.edge_color, // Green default edge
                  'highlight': $scope.canvasConfig.edge_color, // Purple when selected
                },
              });
              get_child_playbooks(child_playbook_uuid, current_depth + 1, until_depth);
            }
          }
        }).finally(function() {
          defer.resolve();
        })
        .catch(function (_error) {
          console.error(_error);
        });
        return defer.promise;
    }

    function _convertID(parent_uuid, child_uuid) {
      return `${parent_uuid} -> ${child_uuid}`;
    }

    function getPlaybookInterConnection() {
      playbookConnectionConfig.nodes.clear();
      playbookConnectionConfig.edges.clear();
      const container = document.getElementById($scope.playbookInterconnectionID);
      const options = {
        'height': '600px',
        'width': '97%',
        'physics': {
          'enabled': false
        },
        'layout': {
          'hierarchical': {
            enabled: true,
            levelSeparation: 150,
            nodeSpacing: 500,
            'sortMethod': 'directed',
            'direction': 'UD',
          }
        },
        'edges': {
          'arrows': {
            'to': {
              'enabled': true
            }
          }
        }
      };
      $scope.playbook_interconnection_network = new vis.Network(container, $scope.playbook_interconnection_vis_data, options);
      var canvasElement = document.querySelector('.vis-network');
      if($rootScope.theme.id === 'steel') {
        canvasElement.style.backgroundColor = '#323b47';
        $scope.canvasConfig.node_bg_color = '#206A75';
        $scope.canvasConfig.node_text_color = '#E0F8FC';
        $scope.canvasConfig.edge_color = '#B3B9C4';
      }else if($rootScope.theme.id === 'dark') {
        canvasElement.style.backgroundColor = '#262626';
        $scope.canvasConfig.node_bg_color = '#206A75';
        $scope.canvasConfig.node_text_color = '#E0F8FC';
        $scope.canvasConfig.edge_color = '#B3B9C4';
      }else {
        canvasElement.style.backgroundColor = '#F1F2F4';
        $scope.canvasConfig.node_bg_color = '#2153C4';
        $scope.canvasConfig.node_text_color = '#CFDEFB';
        $scope.canvasConfig.edge_color = '#8993A5';
      }
      $scope.playbook_interconnection_network.on('click', function (params) {
        //Added click event on node
      });
      $scope.playbook_interconnection_network.on("stabilizationIterationsDone", function () {
        $scope.playbook_interconnection_network.fit(); // Auto-adjusts view to avoid overlap
      });

      const designer = document.querySelector('#designer');
      const designerScope = angular.element(designer).scope();
      $scope.playbook_uuid = designerScope.playbookEntity.id;

      playbookConnectionConfig.nodes.update({
        'id': $scope.playbook_uuid,
        'label': designerScope.playbookEntity.playbook.name,
        'shape': 'box',
        'level': 0,
        'color': $scope.canvasConfig.node_bg_color,
        'font': { 'color': $scope.canvasConfig.node_text_color },
        'margin': { top: 10, bottom: 10, left: 10, right: 10 }
      });

      $scope.processing = true;
      var promises = [];
      promises.push(get_parent_playbooks($scope.playbook_uuid, 0, 10));
      promises.push(get_child_playbooks($scope.playbook_uuid, 0, 10));
      $q.all(promises).then(function() {
        $scope.processing = false;
      })
    }

    $scope.$watch('parent_playbook_depth', function (new_value, old_value) {
      if(!CommonUtils.isUndefined($scope.playbook_uuid)) {
        get_parent_playbooks($scope.playbook_uuid, 0, new_value);
      }
    });


    $scope.$watch('child_playbook_depth', function (new_value, old_value) {
      if(!CommonUtils.isUndefined($scope.playbook_uuid)) {
        get_child_playbooks($scope.playbook_uuid, 0, new_value);
      }
    });

    init();
  }
})();