'use strict';

define(['ol', 'dc', 'toolbar', 'layermanager', 'SparqlJson', 'query', 'search', 'print', 'permalink', 'measure', 'geolocation', 'feature-crossfilter', 'legend', 'panoramio', 'bootstrap'],

    function(ol, dc, toolbar, layermanager, SparqlJson) {
        var module = angular.module('hs', [
            'hs.toolbar',
            'hs.layermanager',
            'hs.query',
            'hs.search', 'hs.print', 'hs.permalink',
            'hs.geolocation',
            'hs.legend',
            'hs.feature_crossfilter', 'hs.panoramio'
        ]);

        module.directive('hs', ['Core', function(Core) {
            return {
                templateUrl: hsl_path + 'hslayers.html',
                link: function(scope, element) {
                    Core.fullscreenMap(element);
                }
            };
        }]);

        module.value('box_layers', [{
            id: 'base',
            'img': 'osm.png',
            title: 'Base layer'
        }, {
            id: 'tourismus',
            'img': 'bicycle-128.png',
            title: 'Tourist info'
        }, {
            id: 'weather',
            'img': 'partly_cloudy.png',
            title: 'Weather'
        }]);

        var style = function(feature, resolution) {
            if (typeof feature.get('visible') === 'undefined' || feature.get('visible') == true) {
                var s = feature.get('http://gis.zcu.cz/poi#category_osm');
                if (typeof s === 'undefined') return;
                s = s.split(".")[1];
                return [new ol.style.Style({
                        image: new ol.style.Circle({
                            fill: new ol.style.Fill({
                                color: feature.color ? feature.color : [242, 121, 0, 0.7]
                            }),
                            stroke: new ol.style.Stroke({
                                color: [0x33, 0x33, 0x33, 0.9]
                            }),
                            radius: 3
                        }),
                        fill: new ol.style.Fill({
                            color: "rgba(139, 189, 214, 0.3)",
                        }),
                        stroke: new ol.style.Stroke({
                            color: "rgba(139, 189, 214, 0.7)",
                        })
                    }),
                    new ol.style.Style({
                        image: new ol.style.Icon({
                            src: 'symbols/' + s + '.svg',
                            crossOrigin: 'anonymous'
                        })
                    })

                ]
            } else {
                return [];
            }
        }

        var route_style = function(feature, resolution) {
            return [new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: "rgba(242, 78, 60, 0.9)",
                    width: 2
                })
            })]
        }

        module.value('default_layers', [
            new ol.layer.Tile({
                source: new ol.source.OSM(),
                title: "OpenStreetMap",
                box_id: 'base',
                base: true,
                visible: false
            }),
            new ol.layer.Tile({
                title: "OpenCycleMap",
                box_id: 'base',
                visible: true,
                source: new ol.source.OSM({
                    url: 'http://{a-c}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png'
                })
            }),
            new ol.layer.Vector({
                title: "Points of interest",
                box_id: 'tourismus',
                maxResolution: 70,
                source: new SparqlJson({
                    url: 'http://ha.isaf2014.info:8890/sparql?default-graph-uri=&query=SELECT+%3Fo+%3Fp+%3Fs%0D%0AFROM+<http%3A%2F%2Fgis.zcu.cz%2Fpoi.rdf>%0D%0AWHERE+%0D%0A%09%7B%3Fo+<http%3A%2F%2Fwww.w3.org%2F2003%2F01%2Fgeo%2Fwgs84_pos%23lat>+%3Flat.+%3Fo+<http%3A%2F%2Fwww.w3.org%2F2003%2F01%2Fgeo%2Fwgs84_pos%23long>+%3Flon.+%0D%0A%09+<extent>%0D%0A%09%3Fo+%3Fp+%3Fs+%0D%0A%09%7D%0D%0AORDER+BY+%3Fo&should-sponge=&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on',
                    category_field: 'http://gis.zcu.cz/poi#category_osm',
                    projection: 'EPSG:3857'
                }),
                style: style
            }),
            new ol.layer.Tile({
                title: "OpenWeatherMap cloud cover",
                box_id: 'weather',
                source: new ol.source.XYZ({
                    url: "http://{a-c}.tile.openweathermap.org/map/clouds/{z}/{x}/{y}.png"
                }),
                visible: false,
                opacity: 0.7
            }),
            new ol.layer.Tile({
                title: "OpenWeatherMap precipitation",
                box_id: 'weather',
                source: new ol.source.XYZ({
                    url: "http://{a-c}.tile.openweathermap.org/map/precipitation/{z}/{x}/{y}.png"
                }),
                visible: false,
                opacity: 0.7
            }),
            new ol.layer.Tile({
                title: "OpenWeatherMap temperature",
                box_id: 'weather',
                source: new ol.source.XYZ({
                    url: "http://{a-c}.tile.openweathermap.org/map/temp/{z}/{x}/{y}.png"
                }),
                visible: false,
                opacity: 0.7
            }),
            new ol.layer.Vector({
                title: "Cycling routes Plzen",
                box_id: 'tourismus',
                source: new ol.source.GeoJSON({
                    url: 'plzensky_kraj.geojson'
                }),
                style: route_style
            }),
            new ol.layer.Vector({
                title: "Cycling routes Zemgale",
                box_id: 'tourismus',
                source: new ol.source.GeoJSON({
                    url: 'zemgale.geojson'
                }),
                style: route_style
            }),
            new ol.layer.Vector({
                title: "Tour de LatEst",
                box_id: 'tourismus',
                source: new ol.source.GeoJSON({
                    url: 'teourdelatest.geojson'
                }),
                style: route_style
            }),
            new ol.layer.Image({
                title: "Forest roads",
                box_id: 'tourismus',
                BoundingBox: [{
                    crs: "EPSG:3857",
                    extent: [1405266, 6146786, 2073392, 6682239]
                }],
                source: new ol.source.ImageWMS({
                    url: 'http://gis.lesprojekt.cz/cgi-bin/mapserv?map=/home/ovnis/sdi4aps_forest_roads.map',
                    params: {
                        LAYERS: 'forest_roads,haul_roads',
                        INFO_FORMAT: "application/vnd.ogc.gml",
                        FORMAT: "image/png; mode=8bit"
                    },
                    crossOrigin: null
                })
            })
        ]);

        module.value('crossfilterable_layers', [{
            layer_ix: 2,
            attributes: ["http://gis.zcu.cz/poi#category_osm"]
        }]);


        module.value('default_view', new ol.View({
            center: [1490321.6967438285, 6400602.013496143], //Latitude longitude    to Spherical Mercator
            zoom: 14,
            units: "m"
        }));

        module.controller('Main', ['$scope', '$filter', 'Core', 'OlMap', 'InfoPanelService', 'feature_crossfilter',
            function($scope, $filter, Core, OlMap, InfoPanelService, feature_crossfilter) {
                if (console) console.log("Main called");
                $scope.hsl_path = hsl_path; //Get this from hslayers.js file
                $scope.Core = Core;

                $scope.$on('infopanel.updated', function(event) {});

                var pop_div = document.createElement('div');
                document.getElementsByTagName('body')[0].appendChild(pop_div);
                var popup = new ol.Overlay({
                    element: pop_div
                });
                OlMap.map.addOverlay(popup);

                $scope.$on('map_clicked', function(event, data) {
                    var coordinate = data.coordinate;
                    var lon_lat = ol.proj.transform(
                        coordinate, 'EPSG:3857', 'EPSG:4326');
                    var p = "http://api.openweathermap.org/data/2.5/weather?lat=" + lon_lat[1] + "&lon=" + lon_lat[0];
                    var url = "/cgi-bin/hsproxy.cgi?toEncoding=utf-8&url=" + window.escape(p);

                    $.ajax({
                            url: url
                        })
                        .done(function(response) {
                            if (console) console.log(response);
                            var element = popup.getElement();

                            var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(
                                coordinate, 'EPSG:3857', 'EPSG:4326'));
                            $(element).popover('destroy');
                            var content = 'No weather info';
                            if (response.weather) {
                                var wind_row = 'Wind: ' + response.wind.speed + 'm/s' + (response.wind.gust ? ' Gust: ' + response.wind.gust + 'm/s' : '');
                                var close_button = '<button type="button" class="close"><span aria-hidden="true">×</span><span class="sr-only" translate>Close</span></button>';
                                var weather = response.weather[0];
                                var cloud = '<img src="http://openweathermap.org/img/w/' + weather.icon + '.png" alt="' + weather.description + '"/>' + weather.description;
                                var temp_row = 'Temperature: ' + (response.main.temp - 273.15).toFixed(1) + ' °C';
                                var date_row = $filter('date')(new Date(response.dt * 1000), 'dd.MM.yyyy HH:mm');
                                content = close_button + '<p><b>' + response.name + '</b><br/><small> at ' + date_row + '</small></p>' + cloud + '<br/>' + temp_row + '<br/>' + wind_row;
                            }
                            $(element).popover({
                                'placement': 'top',
                                'animation': false,
                                'html': true,
                                'content': content
                            });

                            popup.setPosition(coordinate);
                            $(element).popover('show');
                            $('.close', element.nextElementSibling).click(function() {
                                $(element).popover('hide')
                            });
                        });

                });
            }
        ]);

        return module;
    });