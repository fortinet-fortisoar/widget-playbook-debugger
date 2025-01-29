/* 
  author: anonyges@gmail.com
  modified: 250103
*/
'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('playbook_debugger100Ctrl', playbook_debugger100Ctrl);

  playbook_debugger100Ctrl.$inject = ['$scope', '$rootScope', 'API', 'Field', 'toaster', '$resource', '$http', '$q', 'anonygesJSUtil_v1'];

  function playbook_debugger100Ctrl($scope, $rootScope, API, Field, toaster, $resource, $http, $q, anonygesJSUtil_v1) {
    $rootScope.$on('csOpenExecutionLog', function (event, json_data) {
      console.debug(json_data);
    });


    $scope.$on("endpoint:click", function (event, json_data) {
      console.debug(json_data);
    });



    // -------------------------------------------------------- Search String in Playbook Start  --------------------------------------------------------
    $scope.data_cs_search_pattern_model = "";
    $scope.data_cs_search_pattern = new Field({
      "formType": "text",
      "writeable": true,
      "validation": {
        "required": false
      }
    });


    function highlight_step(_step_elem) {
      _step_elem.style.setProperty("border", "3px dotted yellow", "important");
    }


    function unhighlight_step(_step_elem) {
      _step_elem.style.border = "";
    }


    $scope.$watch("data_cs_search_pattern_model", function (new_value, old_value) {
      const playbook_designer = document.querySelector('#designer');
      const playbook_designer_scope = angular.element(playbook_designer).scope();

      const pattern = new_value;
      const search_type = "default";

      const highlighted_step_uuids = [];
      const steps = playbook_designer_scope["playbook"]["steps"];
      for (const _step_uuid of Object.keys(steps)) {
        const _step = steps[_step_uuid];
        const _step_arguments = JSON.stringify(_step["arguments"]);
        const _step_elem = playbook_designer.querySelector(`#step-${_step_uuid}`);
        unhighlight_step(_step_elem);

        if (pattern === "")
          continue;

        if (search_type === "default") {
          if (_step_arguments.toLowerCase().indexOf(pattern.toLowerCase()) >= 0) {
            highlight_step(_step_elem);
            highlighted_step_uuids.push(_step["uuid"]);
          }
        }
        else if (search_type === "case sensitive") {
          if (_step_arguments.indexOf(pattern) >= 0) {
            highlight_step(_step_elem);
            highlighted_step_uuids.push(_step["uuid"]);
          }
        }
        else if (search_type === "regex") {
          if (_step_arguments.match(pattern)) {
            highlight_step(_step_elem);
            highlighted_step_uuids.push(_step["uuid"]);
          }
        }
      }

      const runningPlaybookCtl = document.querySelector('div[data-ng-controller="RunningPlaybookCtl"]');
      const runningPlaybookCtl_scope = angular.element(runningPlaybookCtl).scope()

      if (runningPlaybookCtl_scope) {
        for (const _step_uuid of highlighted_step_uuids) {
          const _step_elem = runningPlaybookCtl.querySelector(`#step-${_step_uuid}`);
          highlight_step(_step_elem);
        }
      }
    });
    // -------------------------------------------------------- Search String in Playbook End  --------------------------------------------------------



    // -------------------------------------------------------- Jinja Debug Editor Start  --------------------------------------------------------
    $scope.data_cs_jinja_debug_editor_settings = anonygesJSUtil_v1.getMonacoEditorSettings()["editorSettings"];
    $scope.data_cs_jinja_debug_editor_settings["language"] = "jinja";
    $scope.data_cs_jinja_debug_editor_settings["theme"] = "vs-dark";
    // -------------------------------------------------------- Jinja Debug Editor End  --------------------------------------------------------



    // -------------------------------------------------------- Export Playbook To Debug Start  --------------------------------------------------------
    const workflow_collection_data = {
      "type": "workflow_collections",
      "data": [
        {
          "@context": "/api/3/contexts/WorkflowCollection",
          "@type": "WorkflowCollection",
          "name": "00 - Playbook Debugger - Exported Playbooks",
          "description": null,
          "visible": true,
          "image": null,
          "uuid": "8816ee5f-1aa5-414b-ada8-a01680b947ff",
          "id": 4474955,
          "createDate": 0,
          "modifyDate": 0,
          "deletedAt": null,
          "importedBy": [],
          "recordTags": [],
          "workflows": []
        }
      ],
      "exported_tags": []
    }


    function bt_save_to_file(export_playbook_data) {
      delete export_playbook_data["@context"];
      delete export_playbook_data["@id"];
      for (const _step of export_playbook_data["steps"]) {
        delete _step["@id"];
        _step["stepType"] = _step["stepType"]["@id"];
      }
      for (const _route of export_playbook_data["routes"]) {
        delete _route["@id"];
      }
      delete export_playbook_data["priority"]; // = export_playbook_data["priority"]["@id"];
      delete export_playbook_data["createUser"]; // = export_playbook_data["createUser"]["@id"];
      delete export_playbook_data["modifyUser"]; // = export_playbook_data["modifyUser"]["@id"];

      let workflow_collection = JSON.parse(JSON.stringify(workflow_collection_data));
      workflow_collection["data"][0]["workflows"].push(export_playbook_data);

      const jsonString = JSON.stringify(workflow_collection);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exported_playbook_data.json';
      a.click();
      window.URL.revokeObjectURL(url);
    }


    function return_step_result_by_step_name(_executed_response_steps, step_name) {
      for (const _step of _executed_response_steps)
        if (_step["name"] === step_name)
          return _step;
    }


    $scope.bt_export_executed_playbook = bt_export_executed_playbook;
    function bt_export_executed_playbook() {
      const runningPlaybookCtl = document.querySelector('div[data-ng-controller="RunningPlaybookCtl"]');
      const runningPlaybookCtl_scope = angular.element(runningPlaybookCtl).scope()

      $http.get(API.API + runningPlaybookCtl_scope["activeTab"] + '?')
        .then(function (_executed_playbook_response) {
          // const env = _ex ecuted_response["env"];
          const execution_time = _executed_playbook_response["data"]["created"] - _executed_playbook_response["modified"]; // todo change this to timestamp
          const playbook_input = _executed_playbook_response["data"]["env"]["input"];
          const playbook_api_endpoint = _executed_playbook_response["data"]["template_iri"];

          $http.get(playbook_api_endpoint + "?$relationships=true&$versions=false")
            .then(function (_playbook_response) {
              let export_playbook_data = _playbook_response["data"];
              let get_executed_steps_promise = [];

              for (const _step of export_playbook_data["steps"]) {
                const executed_step = return_step_result_by_step_name(_executed_playbook_response["data"]["steps"], _step["name"]);
                if (executed_step) {
                  get_executed_steps_promise.push($http.get(API.API + executed_step["@id"]));
                }
              }

              $q.all(get_executed_steps_promise)
                .then(function (_executed_step_responses) {
                  for (const idx in _executed_step_responses) {
                    const _executed_step_response = _executed_step_responses[idx]["data"];
                    const step_type_name = export_playbook_data["steps"][idx]["stepType"]["name"];
                    if (step_type_name === "SetVariable") {
                      // _step["arguments"] = executed_step["args"]; // TODO choose from 1, accept jinja or replace everything?
                      export_playbook_data["steps"][idx]["arguments"] = _executed_step_response["result"]; // TODO choose from 1, accept jinja or replace everything?
                    }
                    else if (step_type_name === "cybersponse.abstract_trigger") {
                      // trigger step
                    }
                    else {
                      export_playbook_data["steps"][idx]["arguments"]["mock_result"] = _executed_step_response["result"];
                    }
                  }
                  bt_save_to_file(export_playbook_data);
                })
                .catch(function (_error) {
                  console.debug(_error);
                })
            })
            .catch(function (_response) {

            });
        })
        .catch(function (_response) {

        });
    }

    // -------------------------------------------------------- Export Playbook To Debug End  --------------------------------------------------------




    // -------------------------------------------------------- Get Parent Playbook Start  --------------------------------------------------------
    function get_parent_playbooks(playbook_uuid, current_depth = 0, until_depth) {
      if (until_depth && until_depth <= current_depth)
        return;

      const workflow_search = {
        "filters": [
          {
            "field": "steps.stepType.name",
            "operator": "eq",
            "value": "WorkflowReference"
          },
          {
            "field": "steps.arguments.workflowReference",
            "operator": "contains",
            "value": `/api/3/workflows/${playbook_uuid}`
          }
        ],
        "logic": "AND"
      }

      const http_response = $resource(API.QUERY + "workflows")
        .save(workflow_search)
        .$promise

      http_response
        .then(function (_response) {
          const parent_playbooks = _response["hydra:member"];
          let parent_collections = [];
          for (const workflow of parent_playbooks) {
            parent_collections.push(workflow["collection"].split('/').pop());
            $scope.playbook_interconnection_nodes.update({
              "id": workflow["uuid"],
              "label": workflow["name"],
              "shape": "box",
              "level": -(current_depth + 1)
            });
            $scope.playbook_interconnection_edges.update({
              "id": convert_to_vis_network_edge_id(workflow["uuid"], playbook_uuid),
              "from": workflow["uuid"],
              "to": playbook_uuid
            });

            get_parent_playbooks(workflow["uuid"], current_depth + 1, until_depth);
          }
        })
        .catch(function (_error) {
          console.error(_error);
        });
    }


    async function get_collection_names(collection_uuids) {
      let collection_uuid = {};
      let playbook_json_data_to_render = [];

      return $http.get(API.BASE + `workflow_collections?&__selectFields=name&uuid\$in=${collection_uuids.join('|')}`);

      // for (const collection of _response["data"]["hydra:member"]) {
      //     collection_uuid[collection["uuid"]] = collection["name"];
      // }

      // // TODO change here for not using jinja write static HTML, but too lazy to work on static HTML because no SDK
      // for (const workflow of parent_playbooks) {
      //     playbook_json_data_to_render.push({
      //         "Collections": collection_uuid[workflow["collection"].split('/').pop()],
      //         "Playbook Name": workflow["name"],
      //         "Link": `<a href='/playbooks/${workflow["uuid"]}' target='_blank'>Link</a>`
      //     });
      // }

      // // TODO change here for not using jinja. 
      // anonygesJSUtil_v1.jinja("{{data | json2html()}}", { "data": playbook_json_data_to_render })
      //     .then(function (_response) {
      //         const elem = document.getElementById($scope.parent_playbook_html_id);
      //         elem.innerHTML = _response.result;
      //     })
      //     .catch(function (_error) {
      //         console.error(_error);
      //     });
    }
    // -------------------------------------------------------- Get Parent Playbook End  --------------------------------------------------------



    // -------------------------------------------------------- Get Child Playbook Start  --------------------------------------------------------
    function get_child_playbooks(playbook_uuid, current_depth = 0, until_depth) {
      const http_response = $http({
        method: 'GET',
        url: API.BASE + `workflows/${playbook_uuid}?\$relationships=true&\$versions=true`
      })

      http_response
        .then(function (_response) {
          $scope.playbook_interconnection_nodes.update({
            "id": playbook_uuid,
            "label": _response["data"]["name"],
            "shape": "box",
            "level": current_depth
          });

          if (until_depth && until_depth <= current_depth)
            return;

          const steps = _response["data"]["steps"];
          for (const _step of steps) {
            if (_step["stepType"]["name"] === "WorkflowReference") {
              const child_playbook_uuid = _step["arguments"]["workflowReference"].split('/').pop();
              if (!anonygesJSUtil_v1.is_uuid4(child_playbook_uuid)) {
                console.debug(`not a valid uuid4: ${child_playbook_uuid} in playbook ${_response["data"]["name"]}`);
                continue;
              }

              $scope.playbook_interconnection_nodes.update({
                "id": child_playbook_uuid,
                "label": "Fetching",
                "shape": "box",
                "level": current_depth + 1
              });
              $scope.playbook_interconnection_edges.update({
                "id": convert_to_vis_network_edge_id(playbook_uuid, child_playbook_uuid),
                "from": playbook_uuid,
                "to": child_playbook_uuid
              });
              get_child_playbooks(child_playbook_uuid, current_depth + 1, until_depth);
            }
          }


        })
        .catch(function (_error) {
          console.error(_error);
        });
    }
    // -------------------------------------------------------- Get Child Playbook End  --------------------------------------------------------



    function convert_to_vis_network_edge_id(parent_uuid, child_uuid) {
      return `${parent_uuid} -> ${child_uuid}`;
    }



    // -------------------------------------------------------- Playbook Interconnection Start  --------------------------------------------------------
    $scope.playbook_interconnection_html_id = "dpb-" + crypto.randomUUID();
    $scope.playbook_interconnection_nodes = new vis.DataSet();
    $scope.playbook_interconnection_edges = new vis.DataSet();
    $scope.playbook_interconnection_vis_data = {
      "nodes": $scope.playbook_interconnection_nodes,
      "edges": $scope.playbook_interconnection_edges
    }


    $scope.bt_get_playbook_interconnection = bt_get_playbook_interconnection;
    function bt_get_playbook_interconnection() {
      $scope.playbook_interconnection_nodes.clear();
      $scope.playbook_interconnection_edges.clear();

      const container = document.getElementById($scope.playbook_interconnection_html_id);
      const options = {
        "height": "500px",
        "physics": {
          "enabled": false
        },
        "layout": {
          "hierarchical": {
            "sortMethod": "directed",
            "direction": "UD"
          }
        },
        "edges": {
          "arrows": {
            "to": {
              "enabled": true
            }
          }
        }
      };
      $scope.playbook_interconnection_network = new vis.Network(container, $scope.playbook_interconnection_vis_data, options);

      const designer = document.querySelector('#designer');
      const designerScope = angular.element(designer).scope();
      const playbook_uuid = designerScope.playbookEntity.id;
      $scope.playbook_interconnection_playbook_uuid = playbook_uuid;

      $scope.playbook_interconnection_nodes.update({
        "id": playbook_uuid,
        "label": designerScope.playbookEntity.playbook.name,
        "shape": "box",
        "level": 0
      });

      get_parent_playbooks(playbook_uuid, 0, 10);
      get_child_playbooks(playbook_uuid, 0, 10);
    }


    $scope.$watch("parent_playbook_depth", function (new_value, old_value) {
      get_parent_playbooks($scope.playbook_interconnection_playbook_uuid, 0, new_value);
    });


    $scope.$watch("child_playbook_depth", function (new_value, old_value) {
      get_child_playbooks($scope.playbook_interconnection_playbook_uuid, 0, new_value);
    });
    // -------------------------------------------------------- Playbook Interconnection End  --------------------------------------------------------


    // -------------------------------------------------------- Draggable UI Start  --------------------------------------------------------
    $scope.bt_inject_draggable_ui = bt_inject_draggable_ui;
    function bt_inject_draggable_ui() {
      function set_style_transition_querySelectorAll(querySelector, value) {
        const _elems = document.querySelectorAll(querySelector);
        for (const _elem of _elems) {
          _elem.style.transition = value;
        }
      }


      function set_style_width_querySelectorAll(querySelector, width) {
        const _elems = document.querySelectorAll(querySelector);
        for (const _elem of _elems) {
          _elem.style.width = width;
        }
      }

      function remove_style_querySelectorAll(querySelector) {
        const _elems = document.querySelectorAll(querySelector);
        for (const _elem of _elems) {
          delete _elem.style;
        }
      }

      const _step_collections_from_css = [
        "#step-collections .playbook-btn-holder",
        "#step-collections .playbook-selected-step-container",
        "#step-collections .transclude-container",
        "#step-collections .playbook-advance-action",
        "#step-collections"
      ]
      // check css for step-collections


      let _scope_original_mouse_x = 0;
      let _scope_is_resizing = false;
      let _scope_step_collections_width = 0;
      let _scope_last_step_collections_width = 0;

      let mutation_observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          if (mutation.attributeName == "style") {
            if (!mutation.target.style.width && _scope_last_step_collections_width != 0) {
              for (const _t of _step_collections_from_css)
                set_style_width_querySelectorAll(_t, _scope_last_step_collections_width + "px");
            }
            if (mutation.offsetWidth > 0) {
              mutation.target.style.overflow = "visible";
            }
            else {
              mutation.target.style.overflow = "";
            }
          }
        });
      });
      let observerConfig = {
        attributes: true,
        attributeFilter: ["style"]
      };


      if (!document.getElementById("danny_injected_playbook_step_container_ui_drag_bar")) {
        const danny_injected_playbook_step_container_ui_drag_bar = document.createElement("div");
        danny_injected_playbook_step_container_ui_drag_bar.id = "danny_injected_playbook_step_container_ui_drag_bar";
        danny_injected_playbook_step_container_ui_drag_bar.style.right = "-10px";
        danny_injected_playbook_step_container_ui_drag_bar.style.height = "100%";
        danny_injected_playbook_step_container_ui_drag_bar.style.position = "absolute";
        danny_injected_playbook_step_container_ui_drag_bar.style.bordercolor = "white";
        danny_injected_playbook_step_container_ui_drag_bar.style.width = "10px";
        danny_injected_playbook_step_container_ui_drag_bar.style.background = "gray";
        const step_collections = document.getElementById("step-collections");
        step_collections.appendChild(danny_injected_playbook_step_container_ui_drag_bar);


        danny_injected_playbook_step_container_ui_drag_bar.addEventListener('click', (e) => {
          e.preventDefault();
        });

        // Add mousedown event listener to start resizing
        danny_injected_playbook_step_container_ui_drag_bar.addEventListener('mousedown', (e) => {
          e.preventDefault();
          _scope_is_resizing = true;
          _scope_original_mouse_x = e.clientX;
          _scope_step_collections_width = document.querySelector("#step-collections").offsetWidth; //in px

          for (const _t of _step_collections_from_css)
            set_style_transition_querySelectorAll(_t, "none");
        });


        // Add mouseup event listener to stop resizing
        document.addEventListener('mouseup', () => {
          _scope_is_resizing = false;
          // for (const _t of _step_collections_from_css)
          //     set_style_transition_querySelectorAll(_t, "auto");
        });


        // Add mousemove event listener for resizing
        document.addEventListener('mousemove', (e) => {
          if (!_scope_is_resizing) return;
          _scope_last_step_collections_width = _scope_step_collections_width + (e.clientX - _scope_original_mouse_x);

          // min & max width
          if (_scope_last_step_collections_width <= 360) _scope_last_step_collections_width = 360;
          if (_scope_last_step_collections_width >= document.body.offsetWidth / 2) _scope_last_step_collections_width = document.body.offsetWidth / 2;

          // check css for step-collections
          for (const _t of _step_collections_from_css)
            set_style_width_querySelectorAll(_t, _scope_last_step_collections_width + "px");

          document.getElementById("designer-container").setAttribute("style", "margin-left:" + _scope_last_step_collections_width + "px !important");
        });


        // addEventListener when the user closes the steps...
        const _close_btns = [
          "close-selected-pb-step-form-btn",
          "close-selected-pb-step-btn"
        ]
        for (const _t of _close_btns) {
          const _elem = document.getElementById(_t);
          if (!_elem) continue;
          _elem.addEventListener('click', (e) => {
            _scope_last_step_collections_width = 0;
            for (const _t of _step_collections_from_css) {
              set_style_width_querySelectorAll(_t, null);
              set_style_transition_querySelectorAll(_t, null);
            }
            step_collections.style.width = null;
            step_collections.style.overflow = null;
            step_collections.style.transition = null;

            document.getElementById("designer-container").style.marginLeft = null;
          });
        }

        const targetNode = document.getElementById('step-collections');
        mutation_observer.observe(targetNode, observerConfig);
      }
    }
    // -------------------------------------------------------- Draggable UI End  --------------------------------------------------------



  }
})();