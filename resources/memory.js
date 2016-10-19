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

  var identifierDataAttributeName = 'identifier';

  // Spielstand
  var moveCount = 0;

  /**
   * Münzdaten (asynchron) laden.
   */
  $.getJSON('data/03-result-memory.json', function (data) {
    imageData = data;
    fillBoard();
  });

  /**
   * Brettgröße aus Auswahl im Menü ermittlen.
   */
  var getNumberOfPairs = function () {
    return parseInt($('.sizeSelection').val(), 10) / 2;
  };

  /**
   * Filterfunktion für Münzdaten aus Auswahl im Menü ermitteln.
   */
  var getCenturyFilter = function () {
      var range = JSON.parse($('.centurySelection').val());
      return function (imageRecord) {
        var year = imageRecord.date;
        return range[0] <= year && year < range[1];
      };
  }

  var createCoinFrontSourcePath = function (coin) {
    var prefix = 'file:///opt/digiverso/kenom_viewer/data/3/media/';
    return prefix + coin.front.replace('_media', '');
  };

  /**
   * Zufällig geordnete Liste von Bildern für die Brettgröße erzeugen.
   */
  var createShuffledImageUrls = function () {
    var numberOfPairs = getNumberOfPairs();
    var filteredCoins = _.filter(imageData, getCenturyFilter());
    var selectedCoins = _.sample(filteredCoins, numberOfPairs);
    var imageUrls = [];
    for (var i = 0; i < numberOfPairs; i++) {
      var coin = selectedCoins[i];
      var imageSize = 300;
      var imageParameters = {
        action: 'image',
        sourcepath: createCoinFrontSourcePath(coin),
        width: 300,
        height: 300,
        rotate: 0,
        resolution: 72,
        thumbnail: true,
        ignoreWatermark: true,
      };
      var imageUrl = 'http://www.kenom.de/content/?' + $.param(imageParameters);

      imageUrls.push(imageUrl);
      imageUrls.push(imageUrl);
    }

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
        var identifiyingString = imageUrl.replace(/.*record_/, '').replace(/_vs.*/, '');
        $gameBoard.append('<li data-' + identifierDataAttributeName + '="' + identifiyingString + '"><img src="' + imageUrl + '"/></li>');
    });
  };

  var showModal = function () {
    var modal = document.getElementById('myModal');
    modal.style.display = 'block';
    var span = document.getElementsByClassName('close')[0];

    // When the user clicks on <span> (x), close the modal
    $(span).on('click', function () {
      modal.style.display = 'none';
    });

    // $('.modal').show();
    $('.resetButton').show();
  };

  // win
  var win = function () {
    showModal();
  };

  var updateClickCount = function (newCount) {
      moveCount = newCount;
      var jMoves = $('.moves');
      if (moveCount === 0) {
          jMoves.text('');
      } else if (moveCount === 1) {
          jMoves.text(' 1 Klick');
      } else {
          jMoves.text(moveCount + ' Klicks');
      }
  };

  /**
   * Click-Event Handler für die Auswahl von Kacheln.
   */
  $gameBoard.on('click', 'li', function (event) {
    var $Target = $(event.currentTarget);
    var $Image = $Target.find('img');

    // Klicks auf bereits gefundene oder umgedrehte Karte ignorieren.
    if ($Target.hasClass(foundClass) || $Target.hasClass(peekClass)) {
        return;
    }

    updateClickCount(moveCount + 1);

    // War vorher mehr als eine Karte aufgedeckt, aufgedeckte Karten zurückdrehen.
    var $oldPeek = $gameBoard.find('.' + peekClass);
    if ($oldPeek.length > 1) {
        $oldPeek
            .removeClass(peekClass)
            .removeClass(timeoutClass);
    }

    // Geklickte Karte aufdecken.
    $Target.addClass(peekClass);

    // Nach dem Aufdecken aufgedeckte Karten vergleichen und zum Zurückdrehen markieren, bzw fixieren.
    var $newPeek = $gameBoard.find('.' + peekClass);
    if ($newPeek.length === 2) {
        if ($newPeek.first().data(identifierDataAttributeName) === $newPeek.last().data(identifierDataAttributeName)) {
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
  };

  /**
   * Click Event-Handler für Reset-Knopf.
   */
  $(document).on('click', '.resetButton', resetGame);

  /**
   * Click Event-Handler für das Spielfeld-Größenmenü.
   */
  $(document).on('change', '.sizeSelection, .centurySelection', resetGame);

});
