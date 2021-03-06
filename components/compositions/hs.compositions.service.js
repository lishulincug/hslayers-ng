/**
 * @ngdoc module
 * @module hs.compositions
 * @name hs.compositions
 * @description Composition module
 */

define(['angular', 'ol', 'hs.source.SparqlJson', 'angular-socialshare', 'map', 'ows_nonwms', 'config_parsers'],

    function (angular, ol, SparqlJson, social) {
        return {
            init() {
                angular.module('hs.compositions')
                    /**
                     * @module hs.compositions
                     * @name hs.compositions.service
                     * @ngdoc controller
                     * @description Service of composition module
                     */
                    .service('hs.compositions.service', ['$rootScope', '$location', '$http', 'hs.map.service', 'Core', 'hs.compositions.service_parser', 'config', 'hs.permalink.service_url', '$compile', '$cookies', 'hs.utils.service',
                        function ($rootScope, $location, $http, OlMap, Core, compositionParser, config, permalink, $compile, $cookies, utils) {
                            var me = this;

                            me.data = {};

                            me.data.start = 0;
                            me.data.limit = 20;
                            me.data.next = 20;
                            me.data.useCallbackForEdit = false;

                            me.compositionsLoaded = false;

                            var extentLayer;

                            var ajaxReq;

                            me.loadCompositions = function (params) {
                                me.compositionsLoaded = false;
                                if (angular.isUndefined(params.sortBy)) params.sortBy = 'bbox';
                                if (angular.isUndefined(params.start)) params.start = me.data.start;
                                if (angular.isUndefined(params.limit) || isNaN(params.limit)) params.limit = me.data.limit;
                                var mapSize = OlMap.map.getSize();
                                var mapExtent = angular.isDefined(mapSize) ? OlMap.map.getView().calculateExtent(mapSize) : [0, 0, 100, 100];
                                var b = ol.proj.transformExtent(mapExtent, OlMap.map.getView().getProjection(), 'EPSG:4326');

                                if (angular.isDefined(config.compositions_catalogue_url)) {
                                    extentLayer.getSource().clear();
                                    var query = params.query;
                                    var textFilter = query && angular.isDefined(query.title) && query.title != '' ? encodeURIComponent(" AND title like '*" + query.title + "*' OR abstract like '*" + query.title + "*'") : '';
                                    var keywordFilter = "";
                                    var selected = [];
                                    angular.forEach(params.keywords, function (value, key) {
                                        if (value) selected.push("subject='" + key + "'");
                                    });
                                    if (selected.length > 0)
                                        keywordFilter = encodeURIComponent(' AND (' + selected.join(' OR ') + ')');

                                    var bboxDelimiter = config.compositions_catalogue_url.indexOf('cswClientRun.php') > 0 ? ',' : ' ';
                                    var serviceName = config.compositions_catalogue_url.indexOf('cswClientRun.php') > 0 ? 'serviceName=p4b&' : '';
                                    var bbox = (params.filterExtent ? encodeURIComponent(" and BBOX='" + b.join(bboxDelimiter) + "'") : '');
                                    var url = (config.hostname.user ? config.hostname.user.url : (config.hostname.compositions_catalogue ? config.hostname.compositions_catalogue.url : config.hostname.default.url)) + config.compositions_catalogue_url + "?format=json&" + serviceName + "query=type%3Dapplication" + bbox + textFilter + keywordFilter + "&lang=eng&sortBy=" + params.sortBy + "&detail=summary&start=" + params.start + "&limit=" + params.limit;
                                    url = utils.proxify(url);
                                    if (ajaxReq != null) ajaxReq.abort();
                                    ajaxReq = $.ajax({
                                        url: url
                                    })
                                        .done(function (response) {
                                            me.compositionsLoaded = true;
                                            ajaxReq = null;
                                            me.data.compositions = response.records;
                                            if (response.records && response.records.length > 0) {
                                                me.data.compositionsCount = response.matched;
                                            } else {
                                                me.data.compositionsCount = 0;
                                            }

                                            me.data.next = response.next;
                                            angular.forEach(me.data.compositions, function (record) {
                                                var attributes = {
                                                    record: record,
                                                    hs_notqueryable: true,
                                                    highlighted: false
                                                };
                                                record.editable = false;
                                                if (angular.isUndefined(record.thumbnail)) {
                                                    record.thumbnail = (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + config.status_manager_url + '?request=loadthumb&id=' + record.id;
                                                }
                                                var extent = compositionParser.parseExtent(record.bbox);
                                                //Check if height or Width covers the whole screen
                                                if (!((extent[0] < mapExtent[0] && extent[2] > mapExtent[2]) || (extent[1] < mapExtent[1] && extent[3] > mapExtent[3]))) {
                                                    attributes.geometry = ol.geom.Polygon.fromExtent(extent);
                                                    attributes.is_hs_composition_extent = true;
                                                    var newFeature = new ol.Feature(attributes);
                                                    record.feature = newFeature;
                                                    extentLayer.getSource().addFeatures([newFeature]);
                                                } else {
                                                    //Composition not in extent
                                                }
                                            })
                                            if (!$rootScope.$$phase) $rootScope.$digest();
                                            $rootScope.$broadcast('CompositionsLoaded');
                                            me.loadStatusManagerCompositions(params, b);
                                        })
                                } else {
                                    me.loadStatusManagerCompositions(params, b);
                                }
                            }

                            /**
                             * @ngdoc method
                             * @name hs.compositions.service#loadStatusManagerCompositions
                             * @public
                             * @description Load list of compositions according to current filter values and pager position (filter, keywords, current extent, start composition, compositions number per page). Display compositions extent in map
                             */
                            me.loadStatusManagerCompositions = function (params, bbox) {
                                var url = (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + config.status_manager_url;
                                var query = params.query;
                                var textFilter = query && angular.isDefined(query.title) && query.title != '' ? '&q=' + encodeURIComponent('*' + query.title + '*') : '';
                                url += '?request=list&project=' + encodeURIComponent(config.project_name) + '&extent=' + bbox.join(',') + textFilter + '&start=0&limit=1000&sort=' + getStatusSortAttr(params.sortBy);
                                url = utils.proxify(url);
                                ajaxReq = $.ajax({
                                    url: url,
                                    cache: false
                                })
                                    .done(function (response) {
                                        if (angular.isUndefined(me.data.compositions)) {
                                            me.data.compositions = [];
                                            me.data.compositionsCount = 0;
                                        }
                                        ajaxReq = null;
                                        angular.forEach(response.results, function (record) {
                                            var found = false;
                                            angular.forEach(me.data.compositions, function (composition) {
                                                if (composition.id == record.id) {
                                                    if (angular.isDefined(record.edit)) composition.editable = record.edit;
                                                    found = true;
                                                }
                                            })
                                            if (!found) {
                                                record.editable = false;
                                                if (angular.isDefined(record.edit)) record.editable = record.edit;
                                                if (angular.isUndefined(record.link)) {
                                                    record.link = (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + config.status_manager_url + '?request=load&id=' + record.id;
                                                }
                                                if (angular.isUndefined(record.thumbnail)) {
                                                    record.thumbnail = (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + config.status_manager_url + '?request=loadthumb&id=' + record.id;
                                                }
                                                var attributes = {
                                                    record: record,
                                                    hs_notqueryable: true,
                                                    highlighted: false
                                                }
                                                attributes.geometry = ol.geom.Polygon.fromExtent(compositionParser.parseExtent(record.extent));
                                                record.feature = new ol.Feature(attributes);
                                                extentLayer.getSource().addFeatures([record.feature]);
                                                if (record) {
                                                    me.data.compositions.push(record);
                                                    me.data.compositionsCount = me.data.compositionsCount + 1;
                                                }
                                            }
                                        });
                                        if (!$rootScope.$$phase) $rootScope.$digest();
                                    })
                            }

                            me.resetCompositionCounter = function () {
                                me.data.start = 0;
                                me.data.next = me.data.limit;
                            }

                            me.deleteComposition = function (composition) {
                                var url = (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + config.status_manager_url + '?request=delete&id=' + composition.id + '&project=' + encodeURIComponent(config.project_name);
                                url = utils.proxify(url);
                                ajaxReq = $.ajax({
                                    url: url
                                })
                                    .done(function (response) {
                                        $rootScope.$broadcast('compositions.composition_deleted', composition.id);
                                        me.loadCompositions();
                                    })
                            }

                            me.highlightComposition = function (composition, state) {
                                if (angular.isDefined(composition.feature))
                                    composition.feature.set('highlighted', state)
                            }

                            function getStatusSortAttr(sortBy) {
                                var sortMap = {
                                    bbox: '[{"property":"bbox","direction":"ASC"}]',
                                    title: '[{"property":"title","direction":"ASC"}]',
                                    date: '[{"property":"date","direction":"ASC"}]'
                                };
                                return encodeURIComponent(sortMap[sortBy]);
                            }

                            function callbackForEdit() {
                                Core.openStatusCreator();
                            }

                            function init() {
                                extentLayer = new ol.layer.Vector({
                                    title: "Composition extents",
                                    show_in_manager: false,
                                    source: new ol.source.Vector(),
                                    removable: false,
                                    style: function (feature, resolution) {
                                        return [new ol.style.Style({
                                            stroke: new ol.style.Stroke({
                                                color: '#005CB6',
                                                width: feature.get('highlighted') ? 4 : 1
                                            }),
                                            fill: new ol.style.Fill({
                                                color: 'rgba(0, 0, 255, 0.01)'
                                            })
                                        })]
                                    }
                                });

                                OlMap.map.on('pointermove', function (evt) {
                                    var features = extentLayer.getSource().getFeaturesAtCoordinate(evt.coordinate);
                                    var somethingDone = false;
                                    angular.forEach(extentLayer.getSource().getFeatures(), function (feature) {
                                        if (feature.get("record").highlighted) {
                                            feature.get("record").highlighted = false;
                                            somethingDone = true;
                                        }
                                    });
                                    if (features.length) {
                                        angular.forEach(features, function (feature) {
                                            if (!feature.get("record").highlighted) {
                                                feature.get("record").highlighted = true;
                                                somethingDone = true;
                                            }
                                        })
                                    }
                                    if (somethingDone && !$rootScope.$$phase) $rootScope.$digest();
                                });

                                if (angular.isDefined($cookies.get('hs_layers')) && window.permalinkApp != true) {
                                    var data = $cookies.get('hs_layers');
                                    var layers = compositionParser.jsonToLayers(JSON.parse(data));
                                    for (var i = 0; i < layers.length; i++) {
                                        OlMap.addLayer(layers[i]);
                                    }
                                    $cookies.remove('hs_layers');
                                }

                                OlMap.map.addLayer(extentLayer);

                                if (permalink.getParamValue('composition')) {
                                    var id = permalink.getParamValue('composition');
                                    if (id.indexOf('http') == -1 && id.indexOf(config.status_manager_url) == -1)
                                        id = (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + (config.status_manager_url || '/wwwlibs/statusmanager2/index.php') + '?request=load&id=' + id;
                                    compositionParser.load(id);
                                }
                            }

                            if (angular.isDefined(OlMap.map)) init()
                            else $rootScope.$on('map.loaded', function () { init(); });

                            $rootScope.$on('compositions.composition_edited', function (event) {
                                compositionParser.composition_edited = true;
                            });

                            $rootScope.$on('compositions.load_composition', function (event, id) {
                                id = (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + (config.status_manager_url || '/wwwlibs/statusmanager2/index.php') + '?request=load&id=' + id;
                                compositionParser.load(id);
                            });

                            $rootScope.$on('infopanel.feature_selected', function (event, feature, selector) {
                                if (angular.isDefined(feature.get("is_hs_composition_extent")) && angular.isDefined(feature.get("record"))) {
                                    var record = feature.get("record");
                                    me.data.useCallbackForEdit = false;
                                    feature.set('highlighted', false);
                                    selector.getFeatures().clear();
                                    me.loadComposition(record);
                                }
                            });

                            me.shareComposition = function (record) {
                                var compositionUrl = (Core.isMobile() && config.permalinkLocation ? (config.permalinkLocation.origin + config.permalinkLocation.pathname) : ($location.protocol() + "://" + location.host + location.pathname)) + "?composition=" + encodeURIComponent(record.link);
                                var shareId = utils.generateUuid();
                                var metadata = {};
                                $.ajax({
                                    url: ((config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + config.status_manager_url),
                                    cache: false,
                                    method: 'POST',
                                    async: false,
                                    data: JSON.stringify({
                                        request: 'socialShare',
                                        id: shareId,
                                        url: encodeURIComponent(compositionUrl),
                                        title: record.title,
                                        description: record.abstract,
                                        image: record.thumbnail || 'https://ng.hslayers.org/img/logo.jpg'
                                    }),
                                    success: function (j) {
                                        $http.post('https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyDn5HGT6LDjLX-K4jbcKw8Y29TRgbslfBw', {
                                            longUrl: (config.hostname.user ? config.hostname.user.url : (config.hostname.status_manager ? config.hostname.status_manager.url : config.hostname.default.url)) + config.status_manager_url + "?request=socialshare&id=" + shareId
                                        }).success(function (data, status, headers, config) {
                                            me.data.shareUrl = data.id;
                                        }).error(function (data, status, headers, config) {
                                            console.log('Error creating short Url');
                                        });
                                    }
                                })

                                me.data.shareTitle = record.title;
                                if (config.social_hashtag && me.data.shareTitle.indexOf(config.social_hashtag) <= 0) me.data.shareTitle += ' ' + config.social_hashtag;

                                me.data.shareDescription = record.abstract;
                                if (!$rootScope.$$phase) $rootScope.$digest();
                                $rootScope.$broadcast('composition.shareCreated', me.data);
                            }

                            me.getCompositionInfo = function (composition) {
                                me.data.info = compositionParser.loadInfo(composition.link);
                                me.data.info.thumbnail = composition.thumbnail;
                                return me.data.info;
                            }

                            me.loadCompositionParser = function (record) {
                                var url = record.link;
                                var title = record.title;
                                if (compositionParser.composition_edited == true) {
                                    $rootScope.$broadcast('loadComposition.notSaved', record);

                                } else {
                                    me.loadComposition(url, true);
                                }
                            }

                            me.loadComposition = function (url, overwrite) {
                                compositionParser.load(url, overwrite, me.data.useCallbackForEdit ? callbackForEdit : null);
                            }

                            $rootScope.$on('core.map_reset', function (event, data) {
                                compositionParser.composition_loaded = null;
                                compositionParser.composition_edited = false;
                            });

                            $rootScope.$on('core.mainpanel_changed', function (event) {
                                if (angular.isDefined(extentLayer)) {
                                    if (Core.mainpanel === 'composition_browser' || Core.mainpanel === 'composition') {
                                        extentLayer.setVisible(true);
                                    }
                                    else extentLayer.setVisible(false);
                                }
                            });

                            return me;
                        }])
            }
        }

    })
