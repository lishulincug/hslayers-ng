/**
* @namespace hs.feature_filter
* @memberOf hs  
* @desc Module is used to filter certain features on vector layers based on attribute values.
* It also draws nice charts with bars proportionaly to usage of each value of a particular attribute.
* 
* must provide layers to be fillterable in app.js parametrs:         
*      module.value('crossfilterable_layers', [{
        layer_ix: 1,
        attributes: ["http://gis.zcu.cz/poi#category_osm"]
    }]); 
*/
define(['angular', 'ol', 'angular-material', 'map', 'layermanager'],

    function(angular, ol) {
        var module = angular.module('hs.feature_filter', ['hs.map', 'hs.core', 'ngMaterial', 'hs.layermanager'])
        
            /**
            * @memberof hs.feature_filter
            * @ngdoc directive
            * @name hs.featureFilter.directive
            * @description TODO
            */
            .directive('hs.featureFilter.directive', ['config', function(config) {
                return {
                    templateUrl: `${hsl_path}components/feature_filter/partials/feature_filter${config.design || ''}.html?bust=${gitsha}`,
                    link: function(scope, element) {

                    }
                };
            }])
        
            /**
            * @memberof hs.feature_filter
            * @ngdoc directive
            * @name hs.featureFilter.element.directive
            * @description TODO
            */
            .directive('hs.featureFilter.element.directive', ['config', '$compile', function(config, $compile) {
                // console.log($state);
                return {
                    // templateUrl: `${hsl_path}components/feature_filter/partials/${$state.type}${config.design || ''}.html?bust=${gitsha}`,
                    template: '<ng-include src="getTemplateUrl()"/>',
                    scope: {
                        filter: "="
                    },
                    // link: function(scope, element, attrs) {
                    //     element.html(`${hsl_path}components/feature_filter/partials/${scope.filter.type}${config.design || ''}.html`).show();
                    //     $compile(element.contents())(scope);
                    // },
                    controller: function($scope) {
                        $scope.getTemplateUrl = function() {
                            return `${hsl_path}components/feature_filter/partials/${$scope.filter.type}${config.design || ''}.html?bust=${gitsha}`;
                        };
                    },
                    // templateUrl: function(el, attrs) {
                    //     return `${hsl_path}components/feature_filter/partials/${attrs.filter.type}md.html?bust=${gitsha}`
                    // },
                    // link: function(scope, element, attrs) {
                    //     scope.filter = scope.$eval(attrs.filter);
                    // },
                    // templateUrl: hsl_path + 'components/feature_filter/partials/{{filter.type}}md.html',
                };
            }])
        
            /**
            * @memberof hs.feature_filter
            * @ngdoc service
            * @name hs.featureFilter.service
            * @description TODO
            */
            .service('hs.feature_filter.service', ['$rootScope', 'hs.map.service', 'hs.layermanager.service', 'Core', 'hs.utils.service', 'config', function ($rootScope, OlMap, LayMan, Core, utils, config) {
                var me = {
                    applyFilters: function(layer) {
                        if (!layer) {
                            if (LayMan.currentLayer === undefined) return;
                            layer = LayMan.currentLayer;
                        }
                        if (!('hsFilters' in layer)) return;
                        if (!layer.hsFilters) return;

                        var filters = layer.hsFilters;
                        var source = layer.layer.getSource();
                        source.forEachFeature(function (feature) {
                            feature.setStyle(null);
                        });
                        
                        for (var i in filters) {
                            var filter = filters[i];
                            var displayFeature;

                            switch (filter.type.type) {
                                case 'fieldset':
                                    if (filter.selected.length === 0) {
                                        displayFeature = function (feature, filter) {
                                            return true;
                                        };
                                        break;
                                    }
                                    displayFeature = function (feature, filter) {
                                        return filter.selected.indexOf(feature.values_[filter.valueField]) !== -1;
                                    };
                                    break;
                                case 'slider':
                                    switch (filter.type.parameters) {
                                        case 'lt':
                                            displayFeature = function (feature, filter) {
                                                return feature.values_[filter.valueField] < filter.value;
                                            };
                                            break;
                                        case 'le':
                                            displayFeature = function (feature, filter) {
                                                return feature.values_[filter.valueField] <= filter.value;
                                            };
                                            break;
                                        case 'gt':
                                            displayFeature = function (feature, filter) {
                                                return feature.values_[filter.valueField] > filter.value;
                                            };
                                            break;
                                        case 'ge':
                                            displayFeature = function (feature, filter) {
                                                return feature.values_[filter.valueField] >= filter.value;
                                            };
                                            break;
                                        case 'eq':
                                            displayFeature = function (feature, filter) {
                                                return feature.values_[filter.valueField] === filter.value;
                                            };
                                            break;
                                    }
                                default:
                                    displayFeature = function (feature, filter) {
                                        return true;
                                    };
                            }

                            source.forEachFeature(function(feature) {
                                if (!displayFeature(feature, filter)) feature.setStyle(new ol.style.Style({}));
                            });
                        }
                    }
                };

                $rootScope.$on('layermanager.layer_added', function (e, layer) {
                    if ('hsFilters' in layer) {
                        for (var i in layer.hsFilters) {
                            var filter = layer.hsFilters[i];

                            if (filter.gatherValues) {
                                switch (filter.type.type) {
                                    case 'fieldset': case 'dictionary':
                                        var source = layer.layer.getSource();
                                        source.forEachFeature(function (feature) {
                                            if (filter.values.indexOf(feature.values_[filter.valueField]) !== -1) {
                                                filter.values.push(feature.values_[filter.valueField]);
                                            }
                                        });
                                        break;
                                    case 'dateExtent':
                                        // // TODO: create time range from date extents of the features, convert datetime fields to datetime datatype
                                        // if (filter.range === undefined) filter.range = [];

                                        // var source = layer.layer.getSource();
                                        // source.forEachFeature(function (feature) {
                                        //     if (feature.values_[filter.valueField] < filter.range[0] || filter.range[0] === undefined) {
                                        //         filter.range[0] = feature.values_[filter.valueField];
                                        //     }
                                        //     if (feature.values_[filter.valueField] > filter.range[1] || filter.range[1] === undefined) {
                                        //         filter.range[1] = feature.values_[filter.valueField];
                                        //     }
                                        // });
                                        break;
                                }
                            }

                            if (filter.type.type === "fieldset" && filter.selected === undefined) {
                                filter.selected = filter.values.slice(0);
                            }
                        }
                    }

                    if (layer.layer instanceof ol.layer.Vector) {
                        var source = layer.layer.getSource();
                        console.log(source.getState());
                        var listenerKey = source.on('change', function (e) {
                            if (source.getState() === 'ready') {
                                console.log(source.getState());
                                ol.Observable.unByKey(listenerKey);
                                me.applyFilters(layer);
                            }
                        });
                    }
                });

                return me;
            }])
            
            /**
            * @memberof hs.feature_filter
            * @ngdoc controller
            * @name hs.featureFilter.controller
            * @description TODO
            */
            .controller('hs.feature_filter.controller', ['$scope', 'hs.map.service', 'Core', 'hs.feature_filter.service', 'hs.layermanager.service', 'config',
                function($scope, OlMap, Core, service, LayMan, config) {
                    window.scope = $scope;

                    var map = OlMap.map;

                    $scope.map = OlMap.map;
                    $scope.LayMan = LayMan;
                    $scope.applyFilters = service.applyFilters;

                    $scope.allSelected = function(filter) {
                        return filter.selected.length === filter.values.length;
                    };

                    $scope.isIndeterminate = function(filter) {
                        return (filter.selected.length !== 0 && filter.selected.length !== filter.values.length);
                    };

                    $scope.exists = function(item, list) {
                        return list.indexOf(item) > -1;
                    };

                    $scope.toggle = function(value, selected) {
                        var idx = selected.indexOf(value);
                        if (idx > -1) {
                            selected.splice(idx, 1);
                        } else {
                            selected.push(value);
                        }
                    };

                    $scope.toggleAll = function(filter) {
                        if (filter.selected.length === filter.values.length) {
                            filter.selected = [];
                        } else {
                            filter.selected = filter.values.slice(0);
                        }
                    };

                    // if (Core.mainpanel == 'feature_filter') {
                    //     $scope.createConfiguredCharts();
                    // }
                    // $scope.$on('core.mainpanel_changed', function(event) {
                    //     if (Core.mainpanel == 'feature_filter') {
                    //         $scope.createConfiguredCharts();
                    //     }
                    // })

                    // $scope.$on('infopanel.updated', function(event) {});

                    $scope.$emit('scope_loaded', "featureFilter");
                }
            ]);

    });
