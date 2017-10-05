define(['angular', 'core', 'ngMaterial'],
    function (angular) {
        angular.module('hs.material.sidepanel', ['hs.core'])
            .directive('hs.material.sidepanel.panelright.directive', function () {
                return {
                    templateUrl: hsl_path + 'examples/liberecMaterial/materialComponents/rightPanel.html?bust=' + gitsha,
                    link: function (scope, element) {

                    }
                };
            })

            .service('hs.material.sidepanel.service', ['$rootScope', 'config', '$mdSidenav', '$interval', '$compile',
            function ($rootScope, config, $mdSidenav, $interval, $compile) {
                var me = this;

                me.data = {
                    'sidenav-right': {
                        status: false,
                        content: {
                            title: "Default",
                            innerHtml: "<p>pokus</p>",
                            status: false
                        },
                        directives: {
                            "layerManager": {
                                id: "layerManager",
                                status: false,
                                controller: 'hs.material.layermanager.controller',
                                directive: 'hs.material.layermanager.directive'
                            },
                            "basemap": {
                                id: "basemap",
                                status: false,
                                controller: 'hs.material.basemap.controller',
                                directive: 'hs.material.basemap.directive'
                            },
                            "addLayer": {
                                id: "addLayer",
                                status: false,
                                controller: 'hs.material.addlayer.controller',
                                directive: 'hs.material.addlayer.directive'
                            }
                        },
                        activeDirective: undefined
                    }
                }

                me.closeSidenav = function (id) {
                    me.data[id].status = false;
                    cleanActive(id);
                    mapSizeInterval();
                }
                me.openSidenav = function (id) {
                    me.data[id].status = true;
                    mapSizeInterval();
                }
                me.toogleSidenav = function (id) {
                    me.data[id].status = !me.sidenav[id].status;
                    mapSizeInterval();
                }
                me.isSidenavOpened = function (id) {
                    return me.data[id].status;
                }
                me.isDirectiveOpened = function (id,directive) {
                    return me.data[id].directives[directive].status;
                }
                function mapSizeInterval() {
                    $interval(function () {
                        $rootScope.$broadcast('Core_sizeChanged');
                    }, 20, 40);
                }

                function cleanActive(id){
                    if (me.data[id].activeDirective) {
                        me.data[id].directives[me.data[id].activeDirective].status = false;
                        me.data[id].activeDirective = undefined;
                    }
                }

                $rootScope.$on('menuButtonClicked', function(e,id){
                    cleanActive('sidenav-right');
                    me.data['sidenav-right'].directives[id].status = true;
                    me.data['sidenav-right'].activeDirective = id;
                    me.openSidenav('sidenav-right');
                    if (!$rootScope.$$phase) $rootScope.$digest();
                })

                return me;
            }])

            .controller("hs.material.sidepanel.panelright.controller", ['$scope', 'config', '$mdSidenav', '$interval', '$compile', 'hs.material.sidepanel.service',
                function ($scope, config, $mdSidenav, $interval, $compile, Sidenav) {
                    $scope.sidenav = Sidenav;

                    function addPanel(directive) {
                        var ngShow = "sidenav.isDirectiveOpened('sidenav-right','" + directive.id + "')";
                        var tag = '<div ' + directive.directive + ' ng-controller="' + directive.controller + '" ng-show="' + ngShow + '"></div>';
                        var el = angular.element(tag);
                        angular.element("#sidenav-right").append(el);
                        $compile(el)($scope);
                    }
                    
                    angular.forEach($scope.sidenav.data['sidenav-right'].directives, function(directive){
                        addPanel(directive);
                    })
                }])
    })