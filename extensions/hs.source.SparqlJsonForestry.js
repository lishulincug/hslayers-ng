define(function(require) {
    var ol = require('ol');
    return function(options) {
        var category_map = {};
        var category_id = 0;
        var occupied_xy = {};
        var src = new ol.source.ServerVector({
            format: new ol.format.GeoJSON(),
            loader: function(extent, resolution, projection) {
                if (typeof src.options.clear_on_move !== 'undefined' && src.options.clear_on_move) src.clear();
                if (typeof options.hsproxy == 'undefined') options.hsproxy = false;
                if (src.options.url == '') return;
                var p = src.options.url;
                if (options.hsproxy)
                    p = "/cgi-bin/hsproxy.cgi?toEncoding=utf-8&url=" + encodeURIComponent(p);
                src.loaded = true;
                
                function getPrecision(scinum) {
                    var arr = new Array();
                    // Get the exponent after 'e', make it absolute.  
                    arr = scinum.split('e');
                    var exponent = Math.abs(arr[1]);

                    // Add to it the number of digits between the '.' and the 'e'
                    // to give our required precision.
                    var precision = new Number(exponent);
                    arr = arr[0].split('.');
                    precision += arr[1].length;

                    return precision;
                }
                
                $.ajax({
                        url: p
                    })
                    .done(function(response) {
                        var objects = {};
                        var min = Number.MAX_VALUE;
                        var max = Number.MIN_VALUE;
                        
                        for (var i = 0; i < response.results.bindings.length; i++) {
                            var b = response.results.bindings[i];
                            if (typeof objects[b.o.value] === 'undefined') {
                                objects[b.o.value] = {};
                            }
                            if(b.s.datatype && b.s.datatype=='http://www.w3.org/2001/XMLSchema#double'){
                                s = b.s.value;
                                // Handle exponential numbers.
                                if (s.match(/^[-+]?[1-9]\.[0-9]+e[-]?[1-9][0-9]*$/)) {
                                    s = (+s).toFixed(getPrecision(s));
                                }                               
                                objects[b.o.value][b.p.value] = s;
                            } else {
                                objects[b.o.value][b.p.value] = b.s.value;
                            }
                            /*
                            objects[b.o.value].geom = b.geom.value;
                            objects[b.o.value].value = b.value.value;
                            objects[b.o.value].nut = b.nut.value;
                            */
                            if(b.p.value=='http://www.w3.org/1999/02/22-rdf-syntax-ns#value'){
                                if (min > parseFloat(b.s.value)) min = parseFloat(objects[b.o.value][b.p.value]);
                                if (max < parseFloat(b.s.value)) max = parseFloat(objects[b.o.value][b.p.value]);
                            }
                        }
                        var features = [];
                        var i = 0.0;
                        var rainbow = function(numOfSteps, step, opacity) {
                            // based on http://stackoverflow.com/a/7419630
                            // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distiguishable vibrant markers in Google Maps and other apps.
                            // Adam Cole, 2011-Sept-14
                            // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
                            var r, g, b;
                            var h = step / (numOfSteps * 1.00000001);
                            var i = ~~(h * 4);
                            var f = h * 4 - i;
                            var q = 1 - f;
                            switch (i % 4) {
                                case 2:
                                    r = f, g = 1, b = 0;
                                    break;
                                case 0:
                                    r = 0, g = f, b = 1;
                                    break;
                                case 3:
                                    r = 1, g = q, b = 0;
                                    break;
                                case 1:
                                    r = 0, g = 1, b = q;
                                    break;
                            }
                            var c = "rgba(" + ~~(r * 235) + "," + ~~(g * 235) + "," + ~~(b * 235) + ", " + opacity + ")";
                            return (c);
                        }
                        var step = (max-min)/7.0;
                        for (var c = 0; c <= 7; c++) {
                            var l_bound = parseFloat((min + c*step));
                            var u_bound = parseFloat(min + (c+1.0)*step);
                            
                            category_map[c] = {
                                name:  l_bound.toFixed(2)+ " - " + u_bound.toFixed(2)  ,
                                color: rainbow(7, c, 0.7)
                            };
                        }

                        for (var key in objects) {
                            i++;
                            if(objects[key]['http://www.opengis.net/ont/geosparql#hasGeometry']){
                                var format = new ol.format.WKT();
                                var g_feature = format.readFeature(objects[key]['http://www.opengis.net/ont/geosparql#hasGeometry']);
                                objects[key].geometry = g_feature.getGeometry();
                                objects[key].geometry.transform('EPSG:4326', 'EPSG:3857');
                                delete objects[key]['http://www.opengis.net/ont/geosparql#hasGeometry'];
                                var feature = new ol.Feature(objects[key]);
                                feature.color = rainbow(7, parseInt((objects[key]['http://www.w3.org/1999/02/22-rdf-syntax-ns#value'] - min) / ((max - min) / 7)), 0.7);
                                features.push(feature);
                            }
                        }
                        src.addFeatures(features);
                    });
            },
            strategy: ol.loadingstrategy.all,
            projection: options.projection
        });
        src.options = options;
        src.legend_categories = category_map;
        return src;
    };
});
