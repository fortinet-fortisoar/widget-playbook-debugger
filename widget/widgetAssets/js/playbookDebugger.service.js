/* Copyright start
  Copyright (C) 2008 - 2025 Fortinet Inc.
  All rights reserved.
  FORTINET CONFIDENTIAL & FORTINET PROPRIETARY SOURCE CODE
  Copyright end */
  'use strict';

  (function() {
    angular
      .module('cybersponse')
      .factory('playbookDebuggerService', playbookDebuggerService);
  
      playbookDebuggerService.$inject = ['$q', '$resource', 'API', '$http'];
  
      function playbookDebuggerService($q, $resource, API, $http) {
        var service = {
          getParentPlaybook: getParentPlaybook,
          getChildPlaybook: getChildPlaybook,
          isValidUUID: isValidUUID,
          getMonacoEditorSettings: getMonacoEditorSettings
        };
        return service;
        
        function getParentPlaybook(uuid) {
            var defer = $q.defer();
            let filterConfig = {
                'filters': [
                    {
                    'field': 'steps.stepType.name',
                    'operator': 'eq',
                    'value': 'WorkflowReference'
                    },
                    {
                    'field': 'steps.arguments.workflowReference',
                    'operator': 'contains',
                    'value': `/api/3/workflows/${uuid}`
                    }
                ],
                'logic': 'AND'
            }
        
            $resource(API.QUERY + 'workflows').save(filterConfig, function(result) {
                defer.resolve(result);
            }, function() {
                defer.reject(error);
            });
            return defer.promise;
        }

        function getChildPlaybook(uuid) {
            return $http.get(API.BASE + `workflows/${uuid}?\$relationships=true&\$versions=true`);
        }

        function isValidUUID(uuid) {
            return uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        }

        function getMonacoEditorSettings() {
            return {
                'editorTheme': {
                    'dark': 'vs-dark',
                    'steel': 'vs-dark',
                    'light': 'vs'
                },
                'editorMode': {
                    'js': {
                        'language': 'javascript'
                    },
                    'html': {
                        'language': 'html'
                    },
                    'json': {
                        'language': 'json'
                    },
                    'css': {
                        'language': 'css'
                    },
                    'python': {
                        'language': 'python'
                    },
                    'py': {
                        'language': 'python'
                    },
                    'text': {
                        'language': 'plaintext'
                    },
                    'image': {
                        'language': 'html'
                    },
                    'markdown': {
                        'language': 'plaintext'
                    }
                },
                'editorSettings': {
                    'automaticLayout': true,
                    'lineNumbers': 'on',
                    'roundedSelection': false,
                    'scrollBeyondLastLine': false,
                    'readOnly': false
                },
                'menuImages': {
                    'folder': 'fa fa-folder',
                    'html': 'fa fa-html5',
                    'js': 'fa fa-code',
                    'json': 'icon icon-json-file',
                    'image': 'fa fa-picture-o',
                    'css': 'icon icon-css',
                    'python': 'icon icon-python',
                    'text': 'icon icon-txt'
                }
            }
        }
  
      }
  })();