/* Copyright start
  MIT License
  Copyright (c) 2025 Fortinet Inc
  Copyright end */

'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('editPlaybookUtility100Ctrl', editPlaybookUtility100Ctrl);

        editPlaybookUtility100Ctrl.$inject = ['$scope', 'config', 'widgetUtilityService', '$uibModalInstance'];

    function editPlaybookUtility100Ctrl($scope, config, widgetUtilityService, $uibModalInstance) {
        $scope.config = config;
        $scope.cancel = cancel;

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
                  BTN_CANCEL: widgetUtilityService.translate('playbookDebugger.BTN_CANCEL'),
                  BTN_SAVE: widgetUtilityService.translate('playbookDebugger.BTN_SAVE'),
                  PLAYBOOK_DEBUGGER_EDIT_VIEW_LABEL: widgetUtilityService.translate('playbookDebugger.PLAYBOOK_DEBUGGER_EDIT_VIEW')
                };
              });
            }
            else {
              $timeout(function () {
                cancel();
              }, 100)
            }
          }

        function cancel() {
            $uibModalInstance.dismiss('cancel');
        }

        function init() {
            // To handle backward compatibility for widget
            _handleTranslations();
        }

        init();
    }
})();
