var heatmap;
var map;
var markers = [];
var lat_lng_array = {
    faltaDeAgua: [],
    vazamentos: []
};

var FALTA_MARKER_ICON = "img/aguanossa-marker.png";
var VAZAMENTO_MARKER_ICON = "img/vazamento-marker.png";
var UPDATE_INTERVAL_NOTIFICATIONS = 30000;
var UPDATE_INTERVAL_CONNECTION = 5000;


angular.module('AguaNossa.controllers', [])

.controller('Volume', function ($scope, $rootScope, $http) {
    $scope.graficoVolume = 0.0;
    $scope.chartConfig = liquidFillGaugeDefaultSettings();
    $scope.chartConfig.circleColor = "#FF7777";
    $scope.chartConfig.textColor = "#FF4444";
    $scope.chartConfig.waveTextColor = "#FFAAAA";
    $scope.chartConfig.circleThickness = 0.1;
    $scope.chartConfig.textVertPosition = 0.5;
    $scope.chartConfig.waveAnimateTime = 1500;
    $scope.chartConfig.waveCount = 3;
    
    $rootScope.displayNoticias = false;

    $http.get("https://contribuatestes.lsd.ufcg.edu.br/aguanossa-backend/get_volume_boqueirao")
        .then(function (response) {
            $scope.graficoVolume = response.data;
            $scope.chart = loadLiquidFillGauge("graficoVolume", $scope.graficoVolume, $scope.chartConfig);

        });
    
    gerarGraficoVolumes()

})

.controller('Mapa', function ($scope, $rootScope, $http, $interval) {
    
    $scope.faltasDeAgua = 0;
    $scope.vazamentos = 0;
    $scope.notifications = {};
    $scope.visualizar = {};
    
    $rootScope.displayNoticias = false;
    
    $scope.initialize = function () {

        $interval($scope.loadNotifications, UPDATE_INTERVAL_NOTIFICATIONS);
        $scope.loadNotifications();

        if ($rootScope.isOn) {
            googleMapsInit();
        }

        $scope.visualizar.vazamentos = true;
        $scope.visualizar.faltasDeAgua = true;
    };

    $scope.loadNotifications = function () {

        console.log("Notifications");
        //$rootScope.checkConnection();

        deleteMarkers();
        lat_lng_array = {
            faltaDeAgua: [],
            vazamentos: []
        };

        $http.get("https://contribuatestes.lsd.ufcg.edu.br/aguanossa-backend/get_notifications").then(function (response) {

            $scope.notifications.faltaDeAgua = response.data;

            for (var i = 0; i < $scope.notifications.faltaDeAgua.length; i++) {
                var notification = $scope.notifications.faltaDeAgua[i];
                if (notification.lat_lng == "") {
                    continue;
                }
                lat_lng_array.faltaDeAgua.push(processLatAndLng(notification.lat_lng));
            }

            var pointArray = new google.maps.MVCArray(lat_lng_array.faltaDeAgua);

            heatmap = new google.maps.visualization.HeatmapLayer({
                data: pointArray,
                radius: 30
            });

            if ($scope.visualizar.faltasDeAgua) {
                placeFaltaMarkers();
            }

            $scope.faltasDeAgua = $scope.notifications.faltaDeAgua.length;

        });

        $http.get("https://contribuatestes.lsd.ufcg.edu.br/aguanossa-backend/get_notifications_vazamentos").then(function (response) {

            $scope.notifications.vazamentos = response.data;

            for (var i = 0; i < $scope.notifications.vazamentos.length; i++) {
                var notification = $scope.notifications.vazamentos[i];
                if (notification.lat_lng == "") {
                    continue;
                }
                lat_lng_array.vazamentos.push(processLatAndLng(notification.lat_lng));
            }

            if ($scope.visualizar.vazamentos) {
                placeVazamentoMarkers();
            }

            $scope.vazamentos = $scope.notifications.vazamentos.length;

            //$scope.isLoadingVazamentos = false;

        });

    };
    
    $scope.$watch("visualizar.faltasDeAgua",
        function handle(newValue, oldValue) {
            if (newValue) {
                placeFaltaMarkers();

            } else {
                deleteMarkers();
                if ($scope.visualizar.vazamentos) {
                    placeVazamentoMarkers();
                }
            }
        }
    );

    $scope.$watch("visualizar.vazamentos",
        function handle(newValue, oldValue) {
            if (newValue) {
                placeVazamentoMarkers();

            } else {
                deleteMarkers();
                if ($scope.visualizar.faltasDeAgua) {
                    placeFaltaMarkers();
                }
            }
        }
    );

    $scope.initialize();

    
})

.controller('Noticias', function ($scope, $rootScope) {
    $rootScope.displayNoticias = true;
})

.controller('Sobre', function ($scope, $rootScope) {
    $rootScope.displayNoticias = false;
})

.controller('Main', function ($scope, $rootScope, $http) {

    $rootScope.isOn = true;

    $rootScope.checkConnection = function () {

        console.log("checking")
        $http.get("https://contribuatestes.lsd.ufcg.edu.br/aguanossa-backend/get_volume_boqueirao").
        then(function (response) {
            if ((response.status >= 200) && (response.status <= 304)) {
                $rootScope.isOn = true;
            } else {
                $rootScope.isOn = false
                
                
            }
        }, function (response) {
            $rootScope.isOn = false;
        })
    }

    $rootScope.$watch("isOn", function handle(newValue, oldValue) {
        if (newValue && (!oldValue)) {
            location.reload();
        }
    });

    setInterval($rootScope.checkConnection,UPDATE_INTERVAL_CONNECTION);
})

//Aux functions

function googleMapsInit() {
    var mapOptions = {
        zoom: 13,
        center: new google.maps.LatLng(-7.220, -35.886) //	centro de campina grande
    };

    map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);

    var showHeatMap = document.createElement('div');
    //var homeControl = new HeatMapControl(showHeatMap, map);
    var showCircleMap = document.createElement('div');
    //var circleControl = new CircleMapControl(showCircleMap, map);

    showHeatMap.index = 1;
    showCircleMap.index = 1;

    // map.controls[google.maps.ControlPosition.TOP_RIGHT].push(showCircleMap);
    //map.controls[google.maps.ControlPosition.TOP_RIGHT].push(showHeatMap);
}

function HeatMapControl(controlDiv, map) {
    // Set CSS styles for the DIV containing the control
    // Setting padding to 5 px will offset the control
    // from the edge of the map
    controlDiv.style.padding = '4px';

    // Set CSS for the control border
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = 'white';
    controlUI.style.borderStyle = 'solid';
    controlUI.style.borderWidth = '1px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Clique para mostrar o mapa de intensidade';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.style.fontFamily = 'questrialRegular';
    controlText.style.fontSize = '15px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = '<b>Mapa de Intensidade</b>';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to
    // Chicago
    google.maps.event.addDomListener(controlUI, 'click', function () {
        toggleHeatmap();
    });
}

function CircleMapControl(controlDiv, map) {
    // Set CSS styles for the DIV containing the control
    // Setting padding to 5 px will offset the control
    // from the edge of the map
    controlDiv.style.padding = '4px';

    // Set CSS for the control border
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = 'white';
    controlUI.style.borderStyle = 'solid';
    controlUI.style.borderWidth = '1px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Clique para mostrar o mapa de círculos gradientes';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('div');
    controlText.style.fontFamily = 'questrialRegular';
    controlText.style.fontSize = '15px';
    controlText.style.paddingLeft = '5px';
    controlText.style.paddingRight = '5px';
    controlText.innerHTML = '<b>Mapa de Círculos</b>';
    controlUI.appendChild(controlText);

    // Setup the click event listeners: simply set the map to
    // Chicago
    google.maps.event.addDomListener(controlUI, 'click', function () {
        toggleCirclemap();
    });
}

function toggleHeatmap() {
    if (heatmap.getMap() == null) {
        deleteMarkers();
        heatmap.setMap(map);
    } else {
        heatmap.setMap(null);
        placeFaltaMarkers();
        placeVazamentoMarkers();
    }
}

function toggleCirclemap() {
    heatmap.setMap(null);
    if (markers.length != 0 && markers[0].type == "circle") {
        deleteMarkers();
        placeFaltaMarkers();
    } else {
        deleteMarkers();
        placeCircles();
    }
}

function processLatAndLng(stringLatAndLng) {
    var lat_lng = stringLatAndLng.split("/");
    var lat = parseFloat(lat_lng[0].trim());
    var lng = parseFloat(lat_lng[1].trim());
    return new google.maps.LatLng(lat, lng);
}

function placeCircles() {
    for (var i = 0; i < lat_lng_array.faltaDeAgua.length; i++) {
        markers.push(placeCircle(lat_lng_array.faltaDeAgua[i]));
    }
}

function placeCircle(location) {
    var circulo = {
        strokeColor: '#d39b07',
        strokeOpacity: 0.8,
        strokeWeight: 1.2,
        fillColor: '#d39b07',
        fillOpacity: 0.2,
        map: map,
        center: location,
        radius: 125,
        type: "circle"
    };
    return new google.maps.Circle(circulo);
}

function placeVazamentoMarkers() {
    for (var i = 0; i < lat_lng_array.vazamentos.length; i++) {
        markers.push(placeVazamentoMarker(lat_lng_array.vazamentos[i]));
    }
}

function placeFaltaMarkers() {
    for (var i = 0; i < lat_lng_array.faltaDeAgua.length; i++) {
        markers.push(placeFaltaMarker(lat_lng_array.faltaDeAgua[i]));
    }
}

function placeFaltaMarker(location) {
    var marker = new google.maps.Marker({
        position: location,
        draggable: false,
        map: map,
        //animation: google.maps.Animation.DROP,
        icon: FALTA_MARKER_ICON,
        //title : "Hello World!"
        type: "default"
    });

    return marker;
}

function placeVazamentoMarker(location) {

    var marker = new google.maps.Marker({
        position: location,
        draggable: false,
        map: map,
        //animation: google.maps.Animation.DROP,
        icon: VAZAMENTO_MARKER_ICON,
        //title : "Hello World!"
        type: "default"
    });
    return marker;
}

function setAllMap(map) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

function clearMarkers() {
    setAllMap(null);
}

function deleteMarkers() {
    clearMarkers();
    markers = [];
}