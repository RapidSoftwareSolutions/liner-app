var ROOT = 'https://liner.imrapid.io';

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null
}

function generateKey(len) {
    var s = [];
    var chars = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var charsLength = 62;
    var idLength = len;
    for (var i = 0; i < idLength; i++)
        s[i] = chars.substr(Math.floor(Math.random() * charsLength), 1);
    var uuid = s.join("");
    return uuid;
};

function Pod(angle, colour, pos) {
	this.angle = angle;
	this.colour = colour;
	this.pos = pos;
}

Pod.prototype.getAngle = function() {
	return {
		transform: 'rotate(' + this.angle + 'deg)',
		'transform-origin': '50% 0%'
	};
};

angular.module('gameApp', [])
  .controller('GameController', ['$scope', '$http', function($scope, $http) {

  		//Check if in room
  		if(!getURLParameter('room')) {
  			document.location.search = 'room='+generateKey(16);
  		}

  		$scope.gameLink = document.location.href;

	  var game = this;
	  
	  //GAME PROPERTIES
	  game.startTime = new Date().getTime();
	  game.loopTime = 4000;
	  game.minDiff = 3;
	  game.pods = [];
	  game.key = generateKey(32);
	  game.status = {
		  status : 'paused',
		  myScore : 0,
		  hisScore : 0,
		  timeLeft : 30
	  };
	  
	  //GAME LOGIC
	  game.addMyPod = function() {
		  var currentAngle = ((new Date().getTime() - game.startTime) % game.loopTime) * 360/game.loopTime;
		  
		  var lost = false;
		  game.pods.forEach(function(p) {
			  if(p.pos - game.minDiff <= currentAngle && currentAngle <= p.pos + game.minDiff)
			  	lost = true;
		  });
		  
		  if(!lost) {
			game.status.myScore++;
			game.multi.addPod(currentAngle);
		  	game.pushPod(currentAngle, 'black');
		  } else {
			  game.multi.addPod(currentAngle);
		  	  game.pushPod(currentAngle, 'black');
			  game.lose();
		  }
	  };
	  
	  game.addOtherPod = function(angle) {
		  game.status.hisScore++;
		  angle += 180;
		  game.pushPod(angle, 'blue');
	  }
	  
	  game.pushPod = function (currentAngle, colour) {
		  if(game.status.status == 'playing')
		  	game.pods.push(new Pod(360 - currentAngle, colour, currentAngle));
	  };
	  
	  game.startGame = function() {
		  game.pods = [];
		  game.startTime = new Date().getTime();
		  game.status.myScore = 0;
		  game.status.hisScore = 0;
		  game.status.playing = true;
		  game.status.status = 'playing';
		  
		  //time keeping
		  game.status.timeLeft = 30;
		  game.timerInterval = setInterval(function() {
			  $scope.$apply(function() {
				  game.status.timeLeft--;
				  if(game.status.timeLeft == 0) {
					  if(game.status.myScore >= game.status.hisScore)
					  	game.win();
					  else
					  	game.lose();
				  }
			  });
		  }, 1000);
	  };
	  
	  game.lose = function() {
		  game.multi.sendLoseMessage();
		  game.stopGame();
		  game.status.status = 'lost';
	  };
	  
	  game.win = function() {
		  console.log("YAYYYYY");
		  game.stopGame();
		  game.status.status = 'won';
	  };
	  
	  game.stopGame = function() {
		  clearInterval(game.timerInterval);
		  game.status.status = 'paused';  
	  };
	  
	  //TIME KEEPING
	  
	  //MULTIPLATER LOGIC
	  game.multi = {
		  players : 0,
		  canPlay : function() {return this.players >= 2;}
	  };
	  
	  var io = createIO('liner', getURLParameter('room'));
	  
	  io.on('join', function(data) {
		  console.log('On join');
		  if (data.from != game.key) {
			  $scope.$apply(function() {
				 game.multi.players++; 
			  });
			  console.log("PLAYERS: "+ game.multi.players);
		  }
	  });
	  
	  io.on('start', function(data) {
		  console.log('On start' + new Date());
			  game.multi.players = 2;
			  $scope.$apply(function() {
				  game.startGame();
			  });
	  });
	  
	  io.on('pod', function(data) {
		  console.log('GOT POD');
		  if (data.from != game.key)
			  $scope.$apply(function() {
			  	game.addOtherPod(parseFloat(data.ang));
			  });
	  });
	  
	  io.on('lost', function(data) {
		  console.log('GOT LOST MESSAGE');
		  if (data.from != game.key)
		  	$scope.$apply(function() {
		  		game.win();
			  });
			  
	  });
	 
	  
	  game.multi.join = function() {
		  var roomName = getURLParameter('room');
		  $http.post(ROOT + '/join', {room:roomName, from:game.key})
		  	.success(function(data, status, headers, config) {
				game.multi.players++;
				console.log("Joined");
			});
	  };
	  
	  game.multi.startGame = function() {
		  var roomName = getURLParameter('room');
		  $http.post(ROOT + '/start', {room:roomName, from:game.key})
		  	.success(function(data, status, headers, config) {
				console.log("Sent start request");
			});  
	  };
	  
	  game.multi.addPod = function(ang) {
		  var roomName = getURLParameter('room');
		  $http.post(ROOT + '/pod', {room:roomName, ang:ang, from:game.key})
		  	.success(function(data, status, headers, config) {
				console.log("Sent pod");
			});  
	  };
	  
	  game.multi.sendLoseMessage = function() {
		  var roomName = getURLParameter('room');
		  $http.post(ROOT + '/lost', {room:roomName, from:game.key})
		  	.success(function(data, status, headers, config) {
				console.log("Sent lost message");
			});
	  };
	  
	  
	  //START MULTIPLAYER HANDSHAKE
	  game.multi.join();
  }]);