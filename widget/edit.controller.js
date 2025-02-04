/* 
  author: anonyges@gmail.com
  modified: 250103
*/
'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('editPlaybook_debugger100Ctrl', editPlaybook_debugger100Ctrl);

    editPlaybook_debugger100Ctrl.$inject = ['$scope', '$uibModalInstance', 'config', 'widgetUtilityService', '$timeout', "PlaybookDesigner"];

    function editPlaybook_debugger100Ctrl($scope, $uibModalInstance, config, widgetUtilityService, $timeout, PlaybookDesigner) {
        $scope.config = config;
        $scope.$on("endpoint:click", function(event, json_data) {
            console.debug(json_data);
        });
    }
})();
