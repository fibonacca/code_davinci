/*global $, _, document */
$(function () {
    'use strict';

    // Die verfügbaren Bilder.
    var imageData = [];

    var $gameBoard = $('#gameBoard');

    // CSS-Klassen
    var foundClass = 'found';
    var peekClass = 'peek';
    var timeoutClass = 'timeout';

    // Namen für Datenfelder and DOM-Elementen
    var identifierDataName = 'identifier';
    var moveCountDataName = 'moveCount';
    var startTimeDataName = 'startTime';
    var timerIdDataName = 'timerId';

    /**
     * Die Anzahl der Memory-Karten auf dem Spielfeld.
     */
    var getBoardDimensions = function () {
        return JSON.parse($('.sizeSelection').val());
    };

    /**
     * Brettgröße aus Auswahl im Menü ermittlen.
     */
    var getNumberOfPairs = function () {
        var dimensions = getBoardDimensions();
        return dimensions[0] * dimensions[1] / 2;
    };

    /**
     * Filterfunktion für Münzdaten aus Auswahl im Menü ermitteln.
     */
    var getCenturyFilter = function () {
        var range = JSON.parse($('.centurySelection').val());
        return function (imageRecord) {
            var year = imageRecord.year;
            return range[0] <= year && year < range[1];
        };
    };

    /**
     * Ist der schwierige Spielmodus, bei dem die Vorder- und
     * Rückseite derselben Münze zusammengefunden werden müssen,
     * aktiviert?
     */
    var isDifficult = function () {
        return $('.difficult').prop('checked');
    };

    /**
     * Pfad-URL zum Bild für die Münze.
     * useBack: false/true -> Vorderseite/Rückseite
     */
    var createCoinSourcePath = function (coin, useBack) {
        var prefix = 'file:///opt/digiverso/kenom_viewer/data/' + coin.magic + '/media/';
        var folderName = 'record_' + coin.id;
        var sideSuffix = useBack ? '_rs' : '_vs';
        var fileName = folderName + sideSuffix + '.jpg';
        return prefix + folderName + '/' + fileName;
    };

    /**
     * Erzeugt die vollständige Bild-URL für die gegebene
     * Münze und Seite.
     */
    var createImageUrl = function (coin, useBack) {
        var imageSize = 300;
        var imageParameters = {
            action: 'image',
            sourcepath: createCoinSourcePath(coin, useBack),
            width: imageSize,
            height: imageSize,
            rotate: 0,
            resolution: 72,
            thumbnail: true,
            ignoreWatermark: true
        };
        return 'http://www.kenom.de/content/?' + $.param(imageParameters);
    };

    /**
     * Zufällig geordnete Liste von Bildern für die Brettgröße erzeugen.
     */
    var createShuffledImageUrls = function () {
        var numberOfPairs = getNumberOfPairs();
        var filteredCoins = _.filter(imageData, getCenturyFilter());
        var selectedCoins = _.sample(filteredCoins, numberOfPairs);
        var useBack = isDifficult();
        var imageUrls = _.flatten(
            _.map(selectedCoins, function (coin) {
                return [
                    createImageUrl(coin, false),
                    createImageUrl(coin, useBack)
                ];
            })
        );

        return _.sample(imageUrls, imageUrls.length);
    };

    /**
     * Frisches Spielfeld mit den übergebenen Bildern erzeugen.
     */
    var fillBoard = function () {
        var selectedImageUrls = createShuffledImageUrls();

        // alte Bilder löschen
        $gameBoard.empty();

        // neue Bilder einfügen
        _.each(selectedImageUrls, function (imageUrl) {
            var identifiyingString = imageUrl.replace(/.*record_/, '').replace(/_[vr]s.*/, '');
            $gameBoard.append('<li data-' + identifierDataName + '="' + identifiyingString + '"><img src="' + imageUrl + '"/></li>');
        });
    };

    var showModal = function () {
        var modal = document.getElementById('myModal');
        modal.style.display = 'block';

        // When the user clicks on <span> (x), close the modal
        $('.close', modal).on('click', function () {
            modal.style.display = 'none';
        });

        var clicks = $gameBoard.data(moveCountDataName);
        var duration = Math.floor(
            (Date.now() - $('.timer').data(startTimeDataName))
            / 1000
        );
        var infoText = clicks + ' Klicks in ' + duration + ' Sekunden';
        $('.modal-footer .details').text(infoText);

        $('.resetButton').show();
    };

    var clearTimer = function () {
        clearInterval($gameBoard.data(timerIdDataName));
        $('.timer').empty();
    };

    // win
    var win = function () {
        clearTimer();
        showModal();
    };

    var updateClickCount = function (newCount) {
        $gameBoard.data(moveCountDataName, newCount);
        var jMoves = $('.moves');
        if (newCount === 0) {
            jMoves.text('');
        } else if (newCount === 1) {
            jMoves.text(' 1 Klick');
        } else {
            jMoves.text(newCount + ' Klicks');
        }

        // Beim ersten Klick den Timer starten.
        if (newCount === 1) {
            var startTime = Date.now();
            var jTimer = $('.timer');
            jTimer.data(startTimeDataName, startTime);
            var timerId = setInterval(function () {
                var duration = Math.floor((Date.now() - startTime) / 1000);
                jTimer.text(duration + 's');
            }, 1000);
            $gameBoard.data(timerIdDataName, timerId);
        }
    };

    /**
     * Click-Event Handler für die Auswahl von Kacheln.
     */
    $gameBoard.on('click', 'li', function (event) {
        var $target = $(event.currentTarget);

        // Klicks auf bereits gefundene oder umgedrehte Karte ignorieren.
        if ($target.hasClass(foundClass) || $target.hasClass(peekClass)) {
            return;
        }

        updateClickCount($gameBoard.data(moveCountDataName) + 1);

        // War vorher mehr als eine Karte aufgedeckt, aufgedeckte Karten zurückdrehen.
        var $oldPeek = $gameBoard.find('.' + peekClass);
        if ($oldPeek.length > 1) {
            $oldPeek
                .removeClass(peekClass)
                .removeClass(timeoutClass);
        }

        // Geklickte Karte aufdecken.
        $target.addClass(peekClass);

        // Nach dem Aufdecken aufgedeckte Karten vergleichen und zum Zurückdrehen markieren, bzw fixieren.
        var $newPeek = $gameBoard.find('.' + peekClass);
        if ($newPeek.length === 2) {
            if ($newPeek.first().data(identifierDataName) === $newPeek.last().data(identifierDataName)) {
                $newPeek
                    .addClass(foundClass)
                    .removeClass(peekClass);
            } else {
                $newPeek.addClass(timeoutClass);
                setTimeout(function () {
                    $newPeek
                        .filter(function (index, element) {
                            return $(element).hasClass(timeoutClass);
                        })
                        .removeClass(peekClass)
                        .removeClass(timeoutClass);
                }, 2000);
            }
        }

        if ($gameBoard.find('.' + foundClass).length === getNumberOfPairs() * 2) {
            win();
        }
    });

    /**
     * Brett neu aufbauen und Spielstand zurücksetzen.
     */
    var resetGame = function () {
        fillBoard();
        $('#container').show();
        $('.modal').hide();
        updateClickCount(0);
        clearTimer();
    };

    /**
     * Click Event-Handler für Reset-Knopf.
     */
    $(document).on('click', '.resetButton, .difficult', resetGame);

    /**
     * Click Event-Handler für das Spielfeld-Größenmenü.
     */
    $(document).on('change', '.sizeSelection, .centurySelection', resetGame);

    /**
     * Münzdaten (asynchron) laden.
     */
    $.getJSON('analyse/06-result-memory.json', function (data) {
        imageData = data;
        resetGame();
    });

});
