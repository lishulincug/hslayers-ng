if (require.config) require.config({
    paths: {
        hs_cesium_camera: hsl_path + 'components/cesium/camera' + hslMin,
        hs_cesium_time: hsl_path + 'components/cesium/time' + hslMin,
        hs_cesium_layers: hsl_path + 'components/cesium/layers' + hslMin,
    }
})

/**
 * @ngdoc module
 * @module hs.cesium
 * @name hs.cesium
 * @description Module containing cesium map
 */
define(['angular', 'cesiumjs', 'permalink', 'ol', 'hs_cesium_camera', 'hs_cesium_time', 'hs_cesium_layers'], function (angular, Cesium, permalink, ol, HsCsCamera, HsCsTime, HsCsLayers) {
    angular.module('hs.cesium', ['hs'])

        /**
         * @module hs.cesium
         * @name hs.cesium.service
         * @ngdoc service
         * @description Contains map object and few utility functions working with whole map. Map object get initialized with default view specified in config module (mostly in app.js file).
         */
        .service('hs.cesium.service', ['config', '$rootScope', 'hs.utils.service', 'hs.map.service', 'hs.layermanager.service', 'Core', function (config, $rootScope, utils, hs_map, layer_manager_service, Core) {
            var viewer;
            var BING_KEY = angular.isDefined(config.cesiumBingKey) ? config.cesiumBingKey : 'Ak5NFHBx3tuU85MOX4Lo-d2JP0W8amS1IHVveZm4TIY9fmINbSycLR8rVX9yZG82';

            /**
             * @ngdoc method
             * @name hs.cesium.service#init
             * @public
             * @description Initializes Cesium map
             */
            this.init = function () {
                if (typeof Cesium == 'undefined') {
                    console.error('Please include cesium in shim definition: cesiumjs: {exports: \'Cesium\'}');
                }
                window.CESIUM_BASE_URL = Core.getNmPath() + 'cesium/Build/Cesium/';
                var terrain_provider = new Cesium.CesiumTerrainProvider({
                    url: config.terrain_provider || 'https://assets.agi.com/stk-terrain/v1/tilesets/world/tiles'
                });

                var view = hs_map.map.getView();
                var ol_ext = view.calculateExtent(hs_map.map.getSize());
                var trans_ext = ol.proj.transformExtent(ol_ext, view.getProjection(), 'EPSG:4326');
                var rectangle = Cesium.Rectangle.fromDegrees(trans_ext[0], trans_ext[1], trans_ext[2], trans_ext[3]);

                Cesium.Camera.DEFAULT_VIEW_FACTOR = 0;
                Cesium.Camera.DEFAULT_VIEW_RECTANGLE = rectangle;
                Cesium.BingMapsApi.defaultKey = BING_KEY;

                var bing = new Cesium.BingMapsImageryProvider({
                    url: 'https://dev.virtualearth.net',
                    key: 'get-yours-at-https://www.bingmapsportal.com/',
                    mapStyle: Cesium.BingMapsStyle.AERIAL
                });
                var cesiumContainerId = 'cesiumContainer';
                viewer = new Cesium.Viewer(cesiumContainerId, {
                    timeline: angular.isDefined(config.cesiumTimeline) ? config.cesiumTimeline : false,
                    animation: angular.isDefined(config.cesiumAnimation) ? config.cesiumAnimation : false,
                    creditContainer: angular.isDefined(config.creditContainer) ? config.creditContainer : undefined,
                    infoBox: angular.isDefined(config.cesiumInfoBox) ? config.cesiumInfoBox : true,
                    terrainProvider: terrain_provider,
                    terrainExaggeration: config.terrainExaggeration || 1.0,
                    // Use high-res stars downloaded from https://github.com/AnalyticalGraphicsInc/cesium-assets
                    skyBox: new Cesium.SkyBox({
                        sources: {
                            positiveX: Core.getNmPath() + 'cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_px.jpg',
                            negativeX: Core.getNmPath() + 'cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mx.jpg',
                            positiveY: Core.getNmPath() + 'cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_py.jpg',
                            negativeY: Core.getNmPath() + 'cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_my.jpg',
                            positiveZ: Core.getNmPath() + 'cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_pz.jpg',
                            negativeZ: Core.getNmPath() + 'cesium/Build/Cesium/Assets/Textures/SkyBox/tycho2t3_80_mz.jpg'
                        }
                    }),
                    // Show Columbus View map with Web Mercator projection
                    sceneMode: Cesium.SceneMode.SCENE3D,
                    mapProjection: new Cesium.WebMercatorProjection(),
                    shadows: false
                });

                viewer.scene.debugShowFramesPerSecond = angular.isDefined(config.cesiumdDebugShowFramesPerSecond) ? config.cesiumdDebugShowFramesPerSecond : false;

                viewer.terrainProvider = terrain_provider;

                me.viewer = viewer;
                HsCsCamera.init(viewer, hs_map);
                HsCsTime.init(viewer, hs_map, me, $rootScope, HsCsLayers);
                HsCsLayers.init(viewer, hs_map, me, $rootScope, config, utils);

                me.HsCsCamera = HsCsCamera;
                me.HsCsTime = HsCsTime;
                me.HsCsLayers = HsCsLayers;

                viewer.camera.moveEnd.addEventListener(function (e) {
                    if (!hs_map.visible) {
                        var center = HsCsCamera.getCameraCenterInLngLat();
                        if (center == null) return; //Not looking on the map but in the sky
                        var viewport = HsCsCamera.getViewportPolygon();
                        $rootScope.$broadcast('map.sync_center', center, viewport);
                    }
                });

                angular.forEach(config.terrain_providers, function (provider) {
                    provider.type = 'terrain';
                    layer_manager_service.data.terrainlayers.push(provider);
                })

                $rootScope.$on('map.extent_changed', function (event, data, b) {
                    var view = hs_map.map.getView();
                    if (hs_map.visible) {
                        HsCsCamera.setExtentEqualToOlExtent(view);
                    }
                });

                $rootScope.$on('search.zoom_to_center', function (event, data) {
                    viewer.camera.setView({
                        destination: Cesium.Cartesian3.fromDegrees(data.coordinate[0], data.coordinate[1], 15000.0)
                    });
                })

                var handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
                handler.setInputAction(function (movement) {
                    var pickRay = viewer.camera.getPickRay(movement.position);
                    var pickedObject = viewer.scene.pick(movement.position);
                    var featuresPromise = viewer.imageryLayers.pickImageryLayerFeatures(pickRay, viewer.scene);
                    if (pickedObject && pickedObject.id && pickedObject.id.onclick) {
                        pickedObject.id.onclick(pickedObject.id);
                        return;
                    }
                    if (!Cesium.defined(featuresPromise)) {
                        if (console) console.log('No features picked.');
                    } else {
                        Cesium.when(featuresPromise, function (features) {

                            var s = '';
                            if (features.length > 0) {
                                for (var i = 0; i < features.length; i++) {
                                    s = s + features[i].data + '\n';
                                }
                            }

                            var iframe = $('.cesium-infoBox-iframe');
                            setTimeout(function () {
                                $('.cesium-infoBox-description', iframe.contents()).html(s.replaceAll('\n', '<br/>'));
                                iframe.height(200);
                            }, 1000);
                        });
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

                function rightClickLeftDoubleClick(movement) {
                    var pickRay = viewer.camera.getPickRay(movement.position);
                    var pickedObject = viewer.scene.pick(movement.position);

                    if (viewer.scene.pickPositionSupported) {
                        if (viewer.scene.mode === Cesium.SceneMode.SCENE3D) {
                            var cartesian = viewer.scene.pickPosition(movement.position);
                            if (Cesium.defined(cartesian)) {
                                var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
                                var longitudeString = Cesium.Math.toDegrees(cartographic.longitude);
                                var latitudeString = Cesium.Math.toDegrees(cartographic.latitude);
                                $rootScope.$emit('cesium_position_clicked', [longitudeString, latitudeString]);
                            }
                        }
                    }
                    if (pickedObject && pickedObject.id && pickedObject.id.onclick) {
                        pickedObject.id.onRightClick(pickedObject.id);
                        return;
                    }
                }

                handler.setInputAction(rightClickLeftDoubleClick, Cesium.ScreenSpaceEventType.RIGHT_DOWN);
                handler.setInputAction(rightClickLeftDoubleClick, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

                /**
                 * @ngdoc event
                 * @name hs.cesium.service#map.loaded
                 * @eventType broadcast on $rootScope
                 * @description 
                 */
                $rootScope.$broadcast('cesiummap.loaded', viewer, me);
            }

            this.dimensionChanged = function(layer, dimension){
                var layer = layer.cesium_layer;
                if (angular.isUndefined(layer.prm_cache) || angular.isUndefined(layer.prm_cache.dimensions) || angular.isUndefined(layer.prm_cache.dimensions[dimension.name])) return;
                me.HsCsLayers.changeLayerParam(layer, dimension.name, dimension.value);
                me.HsCsLayers.removeLayersWithOldParams();
            }

            this.resize = function (event, size) {
                if (angular.isUndefined(size)) return;
                angular.element("#cesiumContainer").height(size.height);
                angular.element('.cesium-viewer-timelineContainer').css({ right: 0 });
                if (angular.element('.cesium-viewer-timelineContainer').length > 0)
                    angular.element('.cesium-viewer-bottom').css({ bottom: '30px' });
                else
                    angular.element('.cesium-viewer-bottom').css({ bottom: 0 });
            }

            this.getCameraCenterInLngLat = HsCsCamera.getCameraCenterInLngLat;
            this.linkOlLayerToCesiumLayer = HsCsLayers.linkOlLayerToCesiumLayer;
            this.broadcastLayerList = HsCsTime.broadcastLayerList;
            var me = this;

        }])

        /**
         * @module hs.cesium
         * @name hs.cesium.directive
         * @ngdoc directive
         * @description 
         */
        .directive('hs.cesium.directive', ['Core', function (Core) {
            return {
                templateUrl: hsl_path + 'components/cesium/partials/cesium.html?bust=' + gitsha,
                link: function (scope, element) { }
            };
        }])

        .directive('hs.cesium.toolbarButtonDirective', function () {
            return {
                templateUrl: hsl_path + 'components/cesium/partials/toolbar_button_directive.html?bust=' + gitsha
            };
        })

        /**
         * @module hs.cesium
         * @name hs.cesium.controller
         * @ngdoc controller
         * @description 
         */
        .controller('hs.cesium.controller', ['$scope', 'hs.cesium.service', 'config', 'hs.permalink.service_url', 'Core', 'hs.map.service', 'hs.sidebar.service', '$timeout', '$rootScope',
            function ($scope, service, config, permalink, Core, hs_map, sidebar_service, $timeout, $rootScope) {

                var map = service.map;

                /**
                 * @ngdoc method
                 * @name hs.cesium.controller#init
                 * @public
                 * @description 
                 */
                $scope.init = function () {
                    if (hs_map.map)
                        service.init();
                    else
                        $rootScope.$on('map.loaded', function () {
                            service.init();
                        });
                }

                /**
                 * @ngdoc method
                 * @name hs.cesium.controller#toggleCesiumMap
                 * @private
                 * @description Toggles between Cesium and OL maps by setting hs_map.visible variable which is monitored by ng-show. ng-show is set on map directive in map.js link function.
                 */
                function toggleCesiumMap() {
                    hs_map.visible = !hs_map.visible;
                    if (hs_map.visible) {
                        $timeout(function () {
                            Core.updateMapSize();
                        }, 5000)
                    }
                }

                setTimeout(function () {
                    hs_map.visible = false;
                }, 0);

                sidebar_service.extra_buttons.push({
                    title: '3D/2D',
                    icon_class: 'glyphicon glyphicon-globe',
                    click: toggleCesiumMap
                });

                $rootScope.$on('layermanager.dimension_changed', function(e, data){
                    service.dimensionChanged(data.layer, data.dimension)
                });

                $rootScope.$on('Core.mapSizeUpdated', service.resize);
                service.resize();


                $scope.init();
                $scope.$emit('scope_loaded', "CesiumMap");
            }
        ]);
})
