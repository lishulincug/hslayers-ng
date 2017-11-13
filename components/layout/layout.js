/**
 * @namespace hs.layout
 * @memberOf hs
 */
define(['angular', 'core', 'map', 'swipe'],

    function(angular) {
        angular.module('hs.layout', ['hs.core', 'hs.map', 'swipe'])
            /**
            * @memberof hs.mdSidenav
            * @ngdoc directive
            * @name hs.mdSidenav.directive
            * @description TODO
            */
            .directive('hs.mdSidenav.directive', function() {
                return {
                    templateUrl: hsl_path + 'components/layout/partials/sidenav.html?bust=' + gitsha
                };
            })

            /**
            * @memberof hs.mdToolbar
            * @ngdoc directive
            * @name hs.mdToolbar.directive
            * @description TODO
            */
            .directive('hs.mdToolbar.directive', function() {
                return {
                    templateUrl: hsl_path + 'components/layout/partials/toolbar.html?bust=' + gitsha
                };
            })

            .directive('hs.mdOverlay.directive', function() {
                return {
                    templateUrl: hsl_path + 'components/layout/partials/overlay.html?bust=' + gitsha
                };
            })

            .directive('hs.swipeArea.directive', function() {
                return {
                    templateUrl: hsl_path + 'components/layout/partials/swipe-area.html?bust=' + gitsha
                };
            })

            /**
            * @memberof hs.layout
            * @ngdoc controller
            * @name hs.layout.controller
            * @description TODO
            */
            .controller('hs.layout.controller', ['$scope', '$rootScope', '$window', 'Core', 'hs.map.service', 'hs.geolocation.service', 'gettextCatalog', 'config', '$templateCache', '$timeout', '$interval', '$mdSidenav', '$mdMenu', '$mdBottomSheet',
                function($scope, $rootScope, $window, Core, OlMap, Geolocation, gettextCatalog, config, $templateCache, $timeout, $interval, $mdSidenav, $mdMenu, $mdBottomSheet) {
                    $scope.Core = Core;
                    $scope.geolocation = Geolocation;
                    $scope.location = {
                        status: {
                            icon: "location_searching",
                            class: "off"
                        }
                    };
                    $scope.defaultFab = {
                        primary: {
                            clickAction: function() {
                                console.log("Primary clicked.");
                            },
                            classes: "",
                            icon: {
                                iconSet: "material-icons",
                                classes: "",
                                text: "add"
                            },
                            tooltip: {
                                direction: "left",
                                text: "Cancel"
                            }
                        },
                        secondary: [
                            {
                                clickAction: function() {
                                    console.log("Secondary 1 clicked.");
                                },
                                classes: "",
                                icon: {
                                    iconSet: "material-icons",
                                    classes: "",
                                    text: "place"
                                },
                                tooltip: {
                                    direction: "left",
                                    text: "New point"
                                }
                            },
                            {
                                clickAction: function() {
                                    console.log("Secondary 2 clicked.");
                                },
                                classes: "",
                                icon: {
                                    iconSet: "material-icons",
                                    classes: "",
                                    text: "timeline"
                                },
                                tooltip: {
                                    direction: "left",
                                    text: "New line"
                                }
                            },
                            {
                                clickAction: function() {
                                    console.log("Secondary 3 clicked.");
                                },
                                classes: "",
                                icon: {
                                    iconSet: "material-icons",
                                    classes: "",
                                    text: "select_all"
                                },
                                tooltip: {
                                    direction: "left",
                                    text: "New polygon"
                                }
                            }
                        ],
                        options: {
                            isOpen: false,
                            tooltipsVisible: false,
                            direction: "up",
                            location: "md-fab-bottom-right"
                        }
                    };
                    
                    $scope.fab = {
                        update: function(primary, secondary, options) {
                            this.primary = angular.copy(primary);
                            if (secondary) {
                                this.secondary = angular.copy(secondary);
                            } else if (this.secondary) {
                                delete this.secondary;
                            }
                            this.options = angular.copy(options);
                        },
                        unset: function() {
                            this.primary = angular.copy($scope.defaultFab.primary);
                            this.secondary = $scope.defaultFab.secondary ? angular.copy($scope.defaultFab.secondary) : undefined;
                            this.options = angular.copy($scope.defaultFab.options);
                        }
                    };

                    $scope.$watch('fab.options.isOpen', function(isOpen) {
                        if (isOpen) {
                            $scope.showTooltips = $timeout(function() {
                                $scope.fab.options.tooltipsVisible = $scope.fab.options.isOpen;
                                $scope.hideTooltips = $timeout(function() {
                                    $scope.fab.options.tooltipsVisible = false;
                                }, 2500);
                            }, 500);
                        } else {
                            $timeout.cancel($scope.showTooltips);
                            $timeout.cancel($scope.hideTooltips);
                            $scope.fab.options.tooltipsVisible = $scope.fab.options.isOpen;
                        }
                    });

                    $scope.$on('scope_loaded', function() {
                        $scope.fab.unset();
                    });

                    $rootScope.$on('$viewContentLoaded', function() {
                        $("#loading-logo").remove();
                    });

                    $timeout(function() {
                        $("#loading-logo").remove();
                    }, 100);

                    $scope.swipeOverlayStatus = false;

                    $rootScope.$on('geolocation.started', function(){
                        $scope.location.status.icon = "my_location";
                        $scope.location.status.class = "searching";
                    });

                    $rootScope.$on('geolocation.updated', function(){
                        $scope.location.status.icon = "my_location";
                        $scope.location.status.class = "on";
                    });

                    $rootScope.$on('geolocation.stopped', function(){
                        $scope.location.status.icon = "location_searching";
                        $scope.location.status.class = "off";
                    });

                    $rootScope.$on('geolocation.failed', function(){
                        $scope.location.status.icon = "location_disabled";
                        $scope.location.status.class = "off";
                    });

                    $scope.openBottomSheet = function(panel) {
                        $scope.closeLeftSidenav();
                        Core.setMainPanel(panel);
                        $mdBottomSheet.show({
                            templateUrl: hsl_path + 'components/layout/partials/bottom-sheet.html?bust=' + gitsha,
                            scope: $scope,
                            preserveScope: true,
                            disableBackdrop: true,
                            clickOutsideToClose: true
                        }).then(function() {
                            console.log("Bottom sheet closed", Date.now());
                        }).catch(function() {
                            console.log("Bottom sheet canceled", Date.now());
                        });
                    }

                    $scope.closeBottomSheet = function() {
                        $mdBottomSheet.hide();
                    }

                    $scope.openLeftSidenav = function() {
                        $mdSidenav('sidenav-left').open()
                        .then(function() {
                            $scope.swipeOverlayStatus = true;
                        });
                    }

                    $scope.closeLeftSidenav = function() {
                        $mdSidenav('sidenav-left').close();
                    }

                    $mdSidenav('sidenav-left', true).then(function(){
                        $mdSidenav('sidenav-left').onClose(function() {
                            $scope.swipeOverlayStatus = false;
                        });
                    });

                    $scope.$emit('scope_loaded', "Layout");
                }

            ])

            .service('hs.layout.service', ['$scope', '$window', 'Core', 'hs.map.service', 'gettextCatalog', 'config', '$templateCache', '$timeout', '$interval', '$mdSidenav', '$mdMenu',
                function($scope, $window, Core, OlMap, gettextCatalog, config, $templateCache, $timeout, $interval, $mdSidenav, $mdMenu) {
                    
                }
            ]);
    })
