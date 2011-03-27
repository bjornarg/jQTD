(function ( $, undefined ) {
    var helperFunctions = {
        fillCircle : function( context, x, y, radius ) {
            context.beginPath();
            context.arc( x, y, radius, 0, Math.PI*2, true );
            context.closePath();
            context.fill();
        },
        strokeCircle : function( context, x, y, radius ) {
            context.beginPath();
            context.arc( x, y, radius, 0, Math.PI*2, true );
            context.closePath();
            context.stroke();
        },
        fillRoundedRect : function( context, x, y, width, height, radius ) {
            context.beginPath();
            context.moveTo( x, y+radius );
            context.lineTo( x, y+height-radius );
            context.quadraticCurveTo( x, y+height, x+radius, y+height );
            context.lineTo( x+width-radius, y+height );
            context.quadraticCurveTo( x+width, y+height, x+width, y+height-radius );
            context.lineTo( x+width, y+radius );
            context.quadraticCurveTo( x+width, y, x+width-radius, y );
            context.lineTo( x+radius, y );
            context.quadraticCurveTo( x, y, x, y+radius );
            context.closePath();
            context.fill();
        },
        strokeRoundedRect : function( context, x, y, width, height, radius ) {
            context.beginPath();
            context.moveTo( x, y+radius );
            context.lineTo( x, y+height-radius );
            context.quadraticCurveTo( x, y+height, x+radius, y+height );
            context.lineTo( x+width-radius, y+height );
            context.quadraticCurveTo( x+width, y+height, x+width, y+height-radius );
            context.lineTo( x+width, y+radius );
            context.quadraticCurveTo( x+width, y, x+width-radius, y );
            context.lineTo( x+radius, y );
            context.quadraticCurveTo( x, y, x, y+radius );
            context.closePath();
            context.stroke();
        },
        // Returns a clone of an object. Performs no deep copying.
        cloneObject : function( object ) {
            newObject = {};
            for ( i in object ) {
                newObject[i] = object[i];
            }
            return newObject;
        },
        calculateAngle : function( position, target ) {
            xDistance = target[0]-position[0];
            yDistance = target[1]-position[1];
            if (xDistance == 0) {
                return 0;
            }
            if (xDistance < 0) {
                return Math.PI+Math.atan(yDistance / xDistance);
            } else {
                return Math.atan(yDistance / xDistance);
            }
        },
        calculateDistance : function( position, target ) {
            return Math.sqrt(
                Math.pow(position[0]-target[0], 2) + 
                Math.pow(position[1]-target[1], 2)
            );
        },
        calculateNewPosition : function( distance, position, angle ) {
            return [
                position[0] + Math.cos(angle) * distance,
                position[1] + Math.sin(angle) * distance
            ];
        },
        time : function() {
            return (new Date()).getTime();
        },
        getRandom : function(between) {
            return between[0] + (between[1]-between[0])*Math.random();
        },
        // Makes a copy of the array without elements that that are 
        // destroyed.
        removeDestroyed : function( arr ) {
            newArray = [];
            arrLength = arr.length;
            for (var i=0; i<arrLength; i++) {
                if ( !arr[i].destroyed ) {
                    newArray.push(arr[i]);
                }
            }
            return newArray;
        },
        inRange : function( position, radius, target ) {
            distance = helperFunctions.calculateDistance(
                position, target
            );
            if (distance-radius <= 0) {
                return true;
            }
            return false;
        }
    };
    var classes = {
        Game : function( canvas, settings ) {
            this.canvas = canvas;
            this.context = canvas.getContext('2d');
            this.settings = settings;
            
            /* Initialization functions */

            this.init = function() {
                // Generate a Map class for the given map
                this.map = new classes.Map();
                this.map.parseMap( settings.map );
                //  Calculate certain parameters that will be used alot
                this.gameWidth = this.canvas.width-this.settings.menuWidth;
                this.gameHeight = this.canvas.height;
                this.settings.cellWidth = this.gameWidth / this.map.width;
                this.settings.cellHeight = this.gameHeight / this.map.height;
                // Initialize variables
                this.cash = this.settings.cash;
                this.score = this.settings.score;
                this.lives = this.settings.lives;

                this.waveStart = helperFunctions.time()+this.settings.timeBetweenWaves;
                // Initialize empty arrays for objects on the map
                this.towers = [];
                this.creeps = [];
                this.projectiles = [];

                this.selected = undefined;
                this.mouseX = 0;
                this.mouseY = 0;
                this.wave = 0;
                this.lastSpawn = 0;
                this.spawnedCreeps = 0;

                this.initMenuSettings();
                this.initBinds();

                this.running = true;
            };
            // Initialize variables that are used to create the menu.
            this.initMenuSettings = function() {
                this.settings.towersLength = this.settings.towers.length;
                var towersPerRow = Math.floor(
                    (this.settings.menuWidth-this.settings.cellWidth)
                    /this.settings.cellWidth
                );
                var towerRows = Math.ceil(
                    this.settings.towersLength / towersPerRow
                );
                var startHeight = this.settings.textHeight*4;
                var spacing = this.settings.cellWidth / ( towersPerRow * 2 );
                this.menuGrid = new Array( towerRows );
                for (var i=0; i<towerRows; i++) {
                    for (var j=0; j<towersPerRow; j++) {
                        if (i*towersPerRow+j > this.settings.towersLength) {
                            break;
                        }
                        if (i == 0) {
                            this.menuGrid[j] = [];
                        }
                        this.menuGrid[j][i] = [
                            this.gameWidth+spacing*2
                            /2+j*(this.settings.cellWidth+spacing),
                            startHeight+(this.settings.cellHeight+spacing)*i
                        ];
                    }
                }
            };
            this.initBinds = function() {
                // Unbind everything first, in case the game has been restarted
                // and we don't want to create several binds to the canvas
                $(this.canvas).unbind('mousemove');
                $(this.canvas).unbind('click');
                $(window).unbind('keypress');
                game = this;
                $(this.canvas).bind('mousemove', function(e) {
                    if (game.guiObject === undefined) {
                        return;
                    }
                    canvasPosition = $(this).position();
                    game.mouseX = e.pageX-canvasPosition.left;
                    game.mouseY = e.pageY-canvasPosition.top;
                });
                $(this.canvas).bind('click', function(e) {
                    if (!game.running) {
                        game.init();
                    } else {
                        if (game.guiObject === undefined) {
                            canvasPosition = $(this).position();
                            game.mouseX = e.pageX-canvasPosition.left;
                            game.mouseY = e.pageY-canvasPosition.top;
                            game.select();
                        } else {
                            game.build();
                        }
                    }
                });
                $(window).bind('keypress', function(e) {
                    usedButton = false;
                    if (e.charCode >= 49 && e.charCode <= 57) {
                        charCode = e.charCode - 49;
                        if (charCode < game.settings.towers.length) {
                            game.guiObject = game.settings.towers[charCode];
                            usedButton = true;
                        }
                    }
                    if (usedButton) {
                        e.preventDefault();
                    }
                });
            };

            this.select = function() {
                this.guiObject = undefined;
                var towerLength = this.towers.length;
                var found = false;
                if (this.selected !== undefined) {
                    this.selected.selected = false;
                }
                this.selected = undefined;
                for (var i=0; i<towerLength; i++) {
                    if (this.mouseX >= this.towers[i].position[0] && 
                            this.mouseX < 
                            this.towers[i].position[0]+this.settings.cellWidth &&
                            this.mouseY >= this.towers[i].position[1] &&
                            this.mouseY <
                            this.towers[i].position[1]+this.settings.cellHeight) {
                        this.towers[i].selected = true;
                        found = true;
                        this.selected = this.towers[i];
                        break;
                    }
                }
                // Check if it's a creep
                if (!found) {
                    var creepLength = this.creeps.length;
                    for (var i=0; i<creepLength; i++) {
                        if (helperFunctions.inRange(
                                [this.mouseX, this.mouseY],
                                this.creeps[i].settings.radius,
                                [this.creeps[i].x, this.creeps[i].y])) {
                            this.selected = this.creeps[i];
                            break;
                        }
                    }
                }
            };

            this.build = function() {
                cell = this.getCell([this.mouseX, this.mouseY]);
                // Check if this cell is not buildable
                if (this.map.pointInArray(this.map.busyCells, cell)) {
                    this.guiObject = undefined;
                    this.select();
                    return;
                }
                position = [cell[0]*this.settings.cellWidth,
                    cell[1]*this.settings.cellHeight];
                tower = new classes.Tower(
                    this.guiObject, position,
                    [this.settings.cellWidth, this.settings.cellHeight]
                );
                this.map.busyCells.push(cell);
                this.towers.push(tower);
            };

            /* Update functions */

            // Main update function of the game. This takes care of updating all
            // the creeps and towers.
            this.update = function() {
                if (!this.running) {
                    return;
                }
                if (this.lives <= 0) {
                    this.endGame();
                    return;
                }
                creepLength = this.creeps.length;
                for (var i=0; i<creepLength; i++) {
                    this.creeps[i].update(this);
                }
                towerLength = this.towers.length;
                for (var i=0; i<towerLength; i++) {
                    this.towers[i].update(this);
                }
                projectileLength = this.projectiles.length;
                for (var i=0; i<projectileLength; i++) {
                    this.projectiles[i].update(this);
                }
                this.removeDestroyed();
                this.spawnCreeps();
                this.draw();
            };
            this.removeDestroyed = function() {
                this.creeps = helperFunctions.removeDestroyed( this.creeps );
                this.projectiles = helperFunctions.removeDestroyed(
                    this.projectiles
                );
                this.towers = helperFunctions.removeDestroyed( this.towers );
            };
            this.spawnCreeps = function() {
                currentTime = helperFunctions.time();
                if (this.wave == this.settings.waves.length) {
                    this.endGame();
                    return;
                }
                if (this.waveStart <= currentTime) {
                    if (this.spawnedCreeps >=
                            this.settings.waves[this.wave].creeps) {
                        if (this.creeps.length == 0) {
                            this.waveStart = (
                                currentTime+this.settings.timeBetweenWaves
                            );
                            this.wave++;
                            this.spawnedCreeps = 0;
                        }
                    } else if (currentTime-this.lastSpawn >=
                            this.settings.waves[this.wave].timeBetweenSpawns) {
                        this.lastSpawn = currentTime;
                        pathNum = helperFunctions.getRandom(
                            [0, this.map.pathsLength]
                        );
                        pathNum = Math.floor(pathNum);
                        path = this.map.paths[pathNum];
                        creep = new classes.Creep(
                            this.settings.waves[this.wave].creep,
                            this.settings.waves[this.wave].level,
                            path
                        );
                        creep.init(this);
                        this.creeps.push(creep);
                        this.spawnedCreeps++;
                    }
                }
            };

            /* Draw functions */

            // Main drawing function that takes care of drawing everything
            this.draw = function() {
                if (!this.running) {
                    return;
                }
                this.context.clearRect(
                    0, 0, this.canvas.width, this.canvas.height
                );
                if (this.guiObject !== undefined) {
                    cell = this.getCell([this.mouseX, this.mouseY]);
                    this.context.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    this.context.fillRect(
                        cell[0]*this.settings.cellWidth,
                        cell[1]*this.settings.cellHeight,
                        this.settings.cellWidth,
                        this.settings.cellHeight
                    );

                }
                this.map.draw(
                    this.context, this.settings,
                    [this.settings.cellWidth, this.settings.cellHeight]
                );
                creepLength = this.creeps.length;
                for (var i=0; i<creepLength; i++) {
                    this.creeps[i].draw(this.context);
                }
                towerLength = this.towers.length;
                for (var i=0; i<towerLength; i++) {
                    this.towers[i].draw(this.context);
                }
                projectileLength = this.projectiles.length;
                for (var i=0; i<projectileLength; i++) {
                    this.projectiles[i].draw(this.context);
                }
                if (this.selected !== undefined && this.selected.type == 'tower') {
                    this.context.strokeStyle = this.settings.rangeStrokeColor;
                    helperFunctions.strokeCircle(
                        this.context,
                        this.selected.position[0]+this.settings.cellWidth/2,
                        this.selected.position[1]+this.settings.cellHeight/2,
                        this.selected.range
                    );
                    this.context.fillStyle = this.settings.rangeFillColor;
                    helperFunctions.fillCircle(
                        this.context,
                        this.selected.position[0]+this.settings.cellWidth/2,
                        this.selected.position[1]+this.settings.cellHeight/2,
                        this.selected.range
                    );
                }
                this.drawMenu();
                currentTime = helperFunctions.time();
                if (currentTime < this.waveStart) {
                    this.context.strokeStyle = this.settings.dialogBorderColor;
                    this.context.fillStyle = this.settings.dialogBackgroundColor;
                    this.context.font = this.settings.largeTextStyle;
                    timeToNextWave = Math.round((this.waveStart-currentTime)/1000);
                    nextWaveText = "Next wave in "+timeToNextWave+"s";
                    nextWaveWidth = this.context.measureText(nextWaveText).width;
                    widthLeft = this.gameWidth-nextWaveWidth;
                    helperFunctions.fillRoundedRect(
                        this.context,
                        widthLeft/4, 50,
                        nextWaveWidth+widthLeft/2,
                        this.settings.largeTextHeight*2, 5
                    );
                    helperFunctions.strokeRoundedRect(
                        this.context,
                        widthLeft/4, 50,
                        nextWaveWidth+widthLeft/2,
                        this.settings.largeTextHeight*2, 5
                    );
                    this.context.fillStyle = this.settings.textColor;
                    this.context.fillText(
                        nextWaveText, widthLeft/2,
                        50+this.settings.largeTextHeight
                    );
                }
            };
            this.drawMenu = function() {
                this.context.fillStyle = this.settings.menuBackgroundColor;
                this.context.fillRect(
                    this.gameWidth, 0, this.settings.menuWidth, this.gameHeight
                );
                this.context.font = this.settings.textStyle;
                this.context.fillStyle = this.settings.menuTextColor;
                var waveString = this.settings.waveText+': '+(this.wave+1);
                var waveWidth = this.context.measureText(waveString).width;
                var cashString = this.settings.cashText+': '+this.cash;
                var cashWidth = this.context.measureText(cashString).width;
                var scoreString = this.settings.scoreText+': '+this.score;
                var scoreWidth = this.context.measureText(scoreString).width;
                var liveString = this.settings.liveText+': '+this.lives;
                var liveWidth = this.context.measureText(liveString).width;
                this.context.fillText(
                    waveString,
                    this.gameWidth+(this.settings.menuWidth-waveWidth)/2,
                    this.settings.textHeight
                );
                this.context.fillText(
                    cashString,
                    this.gameWidth+(this.settings.menuWidth-cashWidth)/2,
                    this.settings.textHeight*2
                );
                this.context.fillText(
                    scoreString,
                    this.gameWidth+(this.settings.menuWidth-scoreWidth)/2,
                    this.settings.textHeight*3
                );
                this.context.fillText(
                    liveString,
                    this.gameWidth+(this.settings.menuWidth-liveWidth)/2,
                    this.settings.textHeight*4
                );
                for (var i=0; i<this.settings.towersLength; i++) {
                    this.context.fillStyle = this.settings.towers[i].color;
                    var x = i % this.menuGrid.length;
                    var y = Math.floor(i/this.menuGrid.length);
                    this.context.fillRect(
                        this.menuGrid[x][y][0],
                        this.menuGrid[x][y][1],
                        this.settings.cellWidth,
                        this.settings.cellHeight
                    );
                }
            };

            /* End game */

            this.endGame = function() {
                this.context.clearRect(0, 0, this.gameWidth, this.gameHeight);
                this.running = false;
                this.context.font = this.settings.largeTextStyle;
                this.context.fillStyle = this.settings.dialogBackgroundColor;
                this.context.strokeStyle = this.settings.dialogBorderColor;
                if (this.settings.callback !== undefined) {
                    this.settings.callback(this.score);
                }
                this.context.fillStyle = this.settings.textColor;
                reclickText = "Click to restart";
                reclickWidth = this.context.measureText(reclickText).width;
                this.context.fillText(
                    reclickText,
                    (this.gameWidth-reclickWidth)/2,
                    50
                );
            };

            this.getCell = function( position ) {
                return [
                    Math.floor(position[0]/this.settings.cellWidth),
                    Math.floor(position[1]/this.settings.cellHeight)
                ];
            };
            this.getCellCenter = function( cell ) {
                return [
                    (cell[0]+0.5)*this.settings.cellWidth,
                    (cell[1]+0.5)*this.settings.cellHeight
                ];
            };
        },
        Map : function() {
            this.paths = [];
            this.elements = [];
            this.busyCells = [];
            this.width;
            this.height;

            this.parseMap = function( mapString ) {
                var spawnPoints = [];
                if ( typeof mapString == "string" ) {
                    mapString = mapString.split("\n");
                }
                this.height = mapString.length;
                firstRun = true;
                for (var y=0; y<this.height; y++) {
                    if ( this.width === undefined ) {
                        this.width = mapString[y].length;
                    }
                    for (var x=0; x<this.width; x++) {
                        if (firstRun) {
                            this.elements[x] = new Array( this.height );
                        }
                        this.elements[x][y] = mapString[y][x];
                        switch ( this.elements[x][y] ) {
                            case 'c':
                                spawnPoints.push([x, y]);
                                break;
                            case 'r':
                                this.busyCells.push([x, y]);
                                break;
                        }
                    }
                    firstRun = false;
                }
                spawnPointsLength = spawnPoints.length;
                for (var i=0; i<spawnPointsLength; i++) {
                    // Will automatically populate this.paths based on spawn point
                    this.calculatePath(spawnPoints[i]);
                }
                // Calculate the number of paths here, since it wont change and we 
                // will not have to redo this again.
                this.pathsLength = this.paths.length;
            }

            // Calculates a path from spawnCell to the end of the map
            this.calculatePath = function( spawnCell ) {
                path = [];
                usedCells = [];
                startCell = spawnCell;
                lastCell = spawnCell;
                direction = undefined;
                while (true) {
                    if (direction == undefined) {
                        var cellInfo = this.getNextValidCell(
                            lastCell, usedCells
                        );
                        if (cellInfo === undefined) {
                            $.error('Map contained no valid paths.');
                            break;
                        }
                        direction = cellInfo.direction;
                        lastCell = cellInfo.cell;
                        usedCells.push(lastCell);
                        continue;
                    }
                    nextCell = this.getNextCell( lastCell, direction );
                    if ( this.isValid( nextCell ) ) {
                        lastCell = nextCell;
                        usedCells.push(lastCell);
                        continue;
                    }
                    path.push(
                        {'direction': direction, 'line': [startCell, lastCell]}
                    );
                    startCell = lastCell;
                    cellInfo = this.getNextValidCell( lastCell, usedCells );
                    if (cellInfo === undefined) {
                        path.push(
                            {
                                'direction': direction,
                                'line': [startCell, lastCell]
                            }
                        );
                        break;
                    }
                    lastCell = cellInfo.cell;
                    direction = cellInfo.direction;
                    usedCells.push(lastCell);
                }
                this.paths.push(path);
            }
            this.getNextValidCell = function( cell, invalidCells ) {
                var possibleDirections = ['d', 'l', 'u', 'r'];
                for (var i=0; i<4; i++) {
                    var nextCell = this.getNextCell(
                        cell, possibleDirections[i]
                    );
                    if (
                        this.isValid(nextCell) && 
                        !this.pointInArray(invalidCells, nextCell)
                    ) {
                        return {
                            'direction': possibleDirections[i],
                            'cell': nextCell
                            }
                    }
                }
                return undefined;
            };
            // Checks whether a creep can move to the given cell
            this.isValid = function( cell ) {
                cellValue = this.elements[cell[0]];
                if ( cellValue == undefined ) {
                    return false;
                }
                cellValue = cellValue[cell[1]];
                if ( cellValue == 'r' || cellValue == 'd' ) {
                    return true;
                }
                return false;
            };
            // Returns the next cell depending on the given cell and direction
            this.getNextCell = function( currentCell, direction ) {
                switch (direction) {
                    case 'd':
                        return [currentCell[0], currentCell[1]+1];
                    case 'u':                                     
                        return [currentCell[0], currentCell[1]-1];
                    case 'r':
                        return [currentCell[0]+1, currentCell[1]];
                    case 'l':                                     
                        return [currentCell[0]-1, currentCell[1]];
                    default:
                        return undefined;
                }
            };
            this.pointInArray = function( arr, point ) {
                arrayLength = arr.length;
                for (j=0; j<arrayLength; j++) {
                    if (arr[j][0] == point[0] && arr[j][1] == point[1]) {
                        return true;
                    }
                }
                return false;
            };
            this.draw = function( context, settings, cellSize ) {
                for (var x=0; x<this.width; x++) {
                    for (var y=0; y<this.height; y++) {
                        switch ( this.elements[x][y] ) {
                            case 'c':
                            case 'r':
                                context.fillStyle = settings.roadColor;
                                context.fillRect(
                                    x*cellSize[0], y*cellSize[1],
                                    cellSize[0], cellSize[1]
                                );
                        }
                    }
                }
            };
        },
        Tower : function( settings, position, cellSize ) {
            this.settings = settings;
            this.position = position;
            this.cellSize = cellSize;
            this.center = [position[0]+cellSize[0], position[1]+cellSize[1]];
            // Default setup
            this.level = 1;
            this.damage = this.settings.damageLevels[0];
            this.range = this.settings.rangeLevels[0];
            this.fireRate = this.settings.fireRateLevels[0];
            this.lastFire = 0;

            this.type = 'tower';

            // Finds positions for a dot per level
            this.dotPosition = new Array( this.settings.maxLevel );
            var totalSpacePerDot = (
                cellSize[0]-this.settings.dotRadius*this.settings.maxLevel
            )/this.settings.maxLevel;
            for (var i=0; i<this.settings.maxLevel; i++) {
                this.dotPosition[i] = [
                    position[0]+i*totalSpacePerDot+this.settings.dotRadius/2,
                    position[1]+cellSize[1]-2
                ];
            }

            this.update = function(game) {
                currentTime = helperFunctions.time();
                if (currentTime-this.lastFire >= this.fireRate) {
                    creepLength = game.creeps.length;
                    for (var i=0; i<creepLength; i++) {
                        if (helperFunctions.inRange(
                            this.center,
                            this.range+game.creeps[i].settings.radius,
                            game.creeps[i].position
                        )) {
                            this.lastFire = currentTime;
                            var target;
                            if (this.settings.seeking) {
                                target = game.creeps[i];
                            } else {
                                target = {'position': game.creeps[i].position};
                            }
                            game.projectiles.push(
                                new classes.Projectile(
                                    {'seeking': this.settings.seeking,
                                     'speed': this.settings.projectileSpeed,
                                     'damage': this.damage,
                                     'color': this.settings.projectileColor,
                                     'radius': this.settings.projectileRadius},
                                    this.center, target)
                            );
                            break;
                        }
                    }
                }
            };
            this.draw = function( context ) {
                if ( this.settings.image === undefined ) {
                    context.fillStyle = this.settings.color;
                    context.fillRect(this.position[0], this.position[1],
                                     cellSize[0], cellSize[1]);
                } else {
                    context.drawImage(
                        this.settings.image,
                        this.position[0],
                        this.position[1]
                    );
                }
                for (var i=0; i<this.level; i++) {
                    context.fillStyle = this.settings.dotColor;
                    helperFunctions.fillCircle(
                        context,
                        this.dotPosition[i][0],
                        this.dotPosition[i][1],
                        this.dotRadius
                    );
                }
            };
            // Upgrades the tower to the next level
            this.upgrade = function() {
                if ( this.level >= this.settings.maxLevel ) {
                    return;
                }
                this.damage = this.settings.damageLevels[this.level];
                this.range = this.settings.damageLevels[this.level];
                this.level++;
            };
        },
        Creep : function( settings, level, path ) {
            this.path = path;
            this.settings = settings;
            this.level = level;

            this.init = function( game ) {
                this.position = game.getCellCenter(this.path[0].line[0]);
                this.direction = this.path[0].direction;
                this.pathPoint = 0;
                this.destroyed = false;
                this.worth = this.settings.worthLevels[this.level-1];
                this.hp = this.settings.hpLevels[this.level-1];
                this.speed = helperFunctions.getRandom(this.settings.speedRange);
                this.pathLength = this.path.length;
            };

            this.update = function( game ) {
                if (this.hp <= 0) {
                    this.kill(game, true);
                    return;
                }
                this.move(game);
            };
            this.move = function( game, moveDistance ) {
                if (moveDistance === undefined) {
                    moveDistance = this.speed;
                }
                endCellCenter = game.getCellCenter(
                    this.path[this.pathPoint].line[1]
                );
                distanceTo = helperFunctions.calculateDistance(
                    this.position, endCellCenter
                );
                if (moveDistance >= distanceTo) {
                    this.position = endCellCenter;
                    moveDistance -= distanceTo;
                    this.pathPoint++;
                    if (this.pathPoint >= this.pathLength-1) {
                        this.kill(game, false);
                        return;
                    }
                    this.direction = this.path[this.pathPoint].direction;
                    if (this.moveDistance > 0) {
                        this.move(game, moveDistance);
                        return;
                    }
                }
                switch (this.direction) {
                    case 'l':
                        this.position[0] -= moveDistance;
                        break;
                    case 'r':
                        this.position[0] += moveDistance;
                        break;
                    case 'u':
                        this.position[1] -= moveDistance;
                        break;
                    case 'd':
                        this.position[1] += moveDistance;
                        break;
                }
            };
            this.kill = function( game, killed ) {
                this.destroyed = true;
                if (!killed) {
                    game.lives--;
                } else {
                    game.score += this.worth;
                    game.cash += this.worth;
                }
            };
            this.draw = function( context ) {
                if (this.settings.image === undefined) {
                    context.fillStyle = this.settings.color;
                    helperFunctions.fillCircle(
                        context,
                        this.position[0], this.position[1],
                        this.settings.radius
                    );
                }
            };
        },
        Projectile : function( settings, position, target ) {
            this.settings = settings;
            this.position = position;
            this.target = target;
            this.destroyed = false;
            this.angle = helperFunctions.calculateAngle(
                position, target.position
            );

            this.update = function( game ) {
                if ( this.settings.seeking && this.target.destroyed ) {
                    // We want to remove a reference to any "live" targets as 
                    // soon as they're destroyed to free up memory
                    this.target = {position: target.position};
                    this.settings.seeking = false;
                }
                if ( this.settings.seeking ) {
                    this.angle = helperFunctions.calculateAngle(
                        this.position, this.target.position
                    );
                }
                this.position = helperFunctions.calculateNewPosition(
                    this.settings.speed, this.position, this.angle
                );
                if (this.position[0] > game.gameWidth || this.position[0] < 0 ||
                    this.position[1] > game.gameHeight || this.position[1] < 0) {
                    this.destroyed = true;
                }
                var radius = this.settings.radius;
                if (this.settings.seeking) {
                    if (this.target.settings.radius !== undefined) {
                        radius += this.target.settings.radius;
                    }
                    if (helperFunctions.inRange(
                        this.position, radius, target.position)) {
                        this.target.hp -= this.damage;
                        this.destroyed = true;
                    }
                } else {
                    creepLength = game.creeps.length;
                    for (var i=0; i<creepLength; i++) {
                        if (game.creeps[i].settings.radius !== undefined) {
                            radius = this.settings.radius + game.creeps[i].settings.radius;
                        }
                        if (helperFunctions.inRange(this.position,
                                radius, game.creeps[i].position)) {
                            game.creeps[i].hp -= this.settings.damage;
                            this.destroyed = true;
                            break;
                        }
                    }
                }
            };
            this.draw = function( context ) {
                if (this.image === undefined) {
                    context.fillStyle = this.settings.color;
                    helperFunctions.fillCircle(
                        context, this.position[0],
                        this.position[1], this.settings.radius
                    );
                }
            };
        },
    };
    var methods = {
        init : function( options ) {
            var settings = {
                'textStyle': '12pt Arial',
                'textHeight': 20, // Since there's no way to measure this
                'largeTextStyle': '20pt Arial',
                'largeTextHeight': 30,

                'waveText': 'Wave',
                'cashText': 'Cash',
                'scoreText': 'Score',
                'liveText': 'Lives',
                'backgroundColor': 'white',
                'textColor': 'black',
                'cellWidth': 0, // Will be set when map is parsed
                'cellHeight': 0, // Will be set when map is parsed
                'creeps': [],
                'map': '',
                'menuBackgroundColor': 'rgb(22, 33, 16)',
                'menuTextColor': 'rgb(191, 205, 184)',
                'dialogBackgroundColor': 'rgba(83, 93, 87, 0.5)',
                'dialogBorderColor': 'rgb(108, 127, 97)',
                'dialogTextColor': 'rgb(124, 159, 105)',
                'rangeStrokeColor': 'rgba(108, 127, 97, 0.8)',
                'rangeFillColor': 'rgba(191, 205, 184, 0.2)',
                'menuWidth': 0,
                'score': 0,
                'cash': 0,
                'lives': 5,
                'towers': [],
                'wave': 0,
                'timeBetweenWaves': 5000,
            };
            // As it is jQuery standard to return the object to maintain
            // chainability, we do it here. Don't really know when it will be
            // usefull in this context tho...
            return this.each(function() {
                var $this = $(this);
                if ( options ) {
                    $.extend( settings, options );
                }
                var game = new classes['Game']( $this[0], settings );
                game.init();
                var updateFunction = function() {
                    game.update();
                    setTimeout(updateFunction, 13);
                };
                updateFunction();
            });
        },
    };
    $.fn.td = function( method ) {
        if ( methods[method] ) {
            return methods[method].apply(
                this, Array.prototype.slice.call( arguments, 1 )
            );
        } else if (typeof method === 'object' || !method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error(
                'Method ' + method + ' does not exist on jQuery.td'
            );
        }
    };
})(jQuery);