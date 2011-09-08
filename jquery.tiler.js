/***************************************************************
 #	jquery.tiler.js											   #
 #	lines up a tiled image in a grid for easy panning/zooming  #
 #	copyright (c) 2011, Oliver Oxenham						   #
 #	prerequisites: Backbone.js, jQuery 						   #
 ***************************************************************/
 
(function($){

	var Map = Backbone.Model.extend({
		defaults: {
			width: 500,
			height: 500	
		},
		initialize: function () {
			_.bindAll(this);
			// console.log('creating new map:', this.get('width'), this.get('height'));
		}
	});

	var MapView = Backbone.View.extend({
		events: {
			"mouseover"  : "handlemouseover",
			"mousedown"  : "handlemousedown",
			"mouseup"    : "handlemouseup",
			"mousemove"  : "handlemousemove",
			"mousewheel" : "handlemousewheel",
			"touchstart" : "handletouchstart",
			"touchmove"  : "handletouchmove"
		},
		initialize: function () {
			_.bindAll(this);
			// based on current width and height,
			var w = $(this.el).width();
			var h = $(this.el).height(); 

			this.model = new Map({
				mouseWheelDelta: { x : 0, y : 0 },
				mouseOrigCoord : { x : 0, y : 0 },
				mouseMoveCoord : { x : 0, y : 0 },
				mousepressed: false
			});
		},
		handletouchstart : function (e) {
            if (e.preventDefault) { e.preventDefault(); }
			var evt = e.originalEvent;
			if (evt.touches.length == 1) { // Only deal with one finger
				// actully store the initial touch move position
				var touch = evt.touches[0]; // Get the information for finger #1
				this.model.set({
					mouseOrigCoord : {
						x : touch.clientX,
						y : touch.clientY
					}
				});
			}
			return false;			
		},
		handletouchmove : function (e) {
            if (e.preventDefault) { e.preventDefault(); }
			var evt = e.originalEvent;
			if (evt.touches.length==1) { // Only deal with one finger				
				// move
				var touch = evt.touches[0]; // Get the information for finger #1    
				this.model.set({
					mouseMoveCoord : {
						x : touch.clientX,
						y : touch.clientY
					}
				});
				if ((this.model.get('mouseMoveCoord').x != this.model.get('mouseOrigCoord').x) || (this.model.get('mouseMoveCoord').y != this.model.get('mouseOrigCoord').y)) {
					this.model.set({
						mouseOrigCoord : { 
							x : touch.clientX,
							y : touch.clientY
						}
					});
				}
			}
			return false;			
		},
		handlemousewheel : function (e) {
            if (e.preventDefault) { e.preventDefault(); }
            var deltaX = 0;
            var deltaY = 0;
            if(e.wheelDelta) { // Chrome/Safari
                deltaX = e.originalEvent.wheelDeltaX / 10; 
                deltaY = e.originalEvent.wheelDeltaY / 10;
            }
            else {
                delta = e.detail / -3; // Mozilla
            }
            this.model.set({ mouseWheelDelta: {x: deltaX, y: deltaY } });
            // $(this.el).fanvenues.setCanvasSize
            return false;
			//paper.setViewBox(x, y, w, h, true);			
		},
		handlemouseover : function (e) {
			return false;			
		},
		handlemousedown : function (e) {
            if (e.preventDefault) { e.preventDefault(); }
			$(this.el).addClass('mousedown');
			this.model.set({
				mouseOrigCoord : {
					x : e.pageX,
					y : e.pageY
				}, 
				mousepressed : true 
			});
			return false;			
		},
		handlemouseup : function (e) {
			$(this.el).removeClass('mousedown');
			this.model.set({ 'mousepressed': false });
			return false;			
		},
		handlemousemove : function (e) {
			if (this.model.get('mousepressed')) {
				this.model.set({
					mouseMoveCoord : {
						x : e.pageX,
						y : e.pageY
					}
				});
				if ((this.model.get('mouseMoveCoord').x != this.model.get('mouseOrigCoord').x) || (this.model.get('mouseMoveCoord').y != this.model.get('mouseOrigCoord').y)) {
					this.model.set({
						mouseOrigCoord : { 
							x : e.pageX,
							y : e.pageY
						}
					});
				}
			}
			return false;			
		},
		render : function () {
			var $canvasViewEl = $(this.canvasView.render().el);
			$(this.el).html($canvasViewEl);
			return this;
		}
	});


	var Tiles = Backbone.Collection.extend({
		model: Tile,
		rows: 1,
		cols: 1
	});

	var Tile = Backbone.Model.extend({
		defaults: {
			imgUrl		: '',
			inViewport 	: false,
			row 		: 0,
			col 		: 0,
			width 		: TILE_SIZE,
			height 		: TILE_SIZE
		},
		initialize: function () {
			this.view = new TileView({
				model: this
			});
			this.bind("change:imgUrl", this.view.render);
			this.bind("clear", function () {
				// console.log('<<<<<< clearing tile #',this.get('id'));
				this.set({ imgUrl : BLANK_IMAGE_URL });
			});

		},

		setImageUrlForZoom : function (zoomlevel) {
			// console.log('setting image for tile', this.get('id'), 'with zoomlevel:', zoomlevel);
			this.set({ imgUrl : constructTileImageUrl(this, zoomlevel) });
		}
	});


	/* Views */
	var TileView = Backbone.View.extend({
		tagName 	: 'div',
		className 	: 'tile',
		initialize : function () {
			_.bindAll(this);
			$(this.el).css({
				width : TILE_SIZE,
				height: TILE_SIZE
			});
		},
		render : function () {
			// console.log('rendering tile', this.model);
			var $this = $(this.el);
			var imgEl;
			var img = $this.find('img');
			if (opts.mapId) {
				if (img.length > 0) {
					imgEl = img;
				}
				else {
					imgEl = $('<img/>');
					$this.append(imgEl);
				}
				imgEl.attr({
					src    : this.model.get('imgUrl')
				});
			}
			img = null;
			imgEl = null;
			return this;
		}
	});

	// a canvas is simply a Tile container
	// canvas size depends on current zoom level (== size of map at this zoom level)
	// canvas size = current tilesize * 2 ^ (zoomlevel - 1) 
	var Canvas = Backbone.Model.extend({
		defaults: {
			zoomlevel 	: 1,
			left 		: 0,
			top 		: 0
		},
		initialize: function () {
			_.bindAll(this);
			// console.log('creating new canvas with:', 'w=', this.get('width'), 'h=', this.get('height'),'z=', this.get('zoomlevel'));
		},
		center: function () {
			var l = (this.get('mapWidth') - this.get('width')) / 2; 		// for centering map in canvas
			var t = (this.get('mapHeight') - this.get('height')) / 2;		// for centering map in canvas
			this.set({left: l, top: t});
		},
		zoomIn : function () {
			// console.log('zooming in canvas');
			if (this.get('zoomlevel') < 5) {
				this.set({ zoomlevel: this.get('zoomlevel') + 1 });
				mapView.model.set({ zoomlevel: this.get('zoomlevel') });
			}
			else
				alert('cannot zoom in further');
		},
		zoomOut : function () {
			// console.log('zooming out canvas');
			if (this.get('zoomlevel') > 1) {
				this.set({zoomlevel: this.get('zoomlevel') - 1});
				mapView.model.set({ zoomlevel: this.get('zoomlevel') });
			}
			else
				alert('cannot zoom out further');
		},
		pan : function () {
			
		}
	});

	var CanvasView = Backbone.View.extend({
		tagName 	: 'div',
		className 	: 'canvas',
		events 		: {},
		initialize : function () {
			_.bindAll(this);
		},
		updatePos : function () {
			$(this.el).css({
				"left" : this.model.get('left'),
				"top" : this.model.get('top')
			});
			// also update mapView
			mapView.model.set({
				leftPos: this.model.get('left'),
				topPos : this.model.get('top')
			});

			// trigger panofv move event
			$panofv.trigger('panofvOnMove');		// external bind event to be implemented by customer
		},
		updateSize : function () {
			$(this.el).css({
				"width" : this.model.get('width'),
				"height": this.model.get('height')
			});
		},
		reposition : function () {
			var zoomlevel = this.model.get('zoomlevel');
			var ow = this.model.get('width');	// original width and height used for repositioning
			var oh = this.model.get('width');	// original width and height used for repositioning
			var cw = TILE_SIZE * Math.pow(2, zoomlevel - 1);	// canvas is always a square
			var ch = TILE_SIZE * Math.pow(2, zoomlevel - 1);	// canvas is always a square
			// console.log('setting canvas size to:', cw, ch);
			this.model.set({ width: cw, height: ch });

			// clear all excess tiles
			var totalTilesRequired = Math.pow(cw / TILE_SIZE, 2);
			/*
			while (this.tiles.models.length > totalTilesRequired) {
				// this.tiles.remove(this.tiles.models[this.tiles.models.length-1]);
			}
			*/
			var t = this.tiles.models.length;
			while (t > totalTilesRequired) {
				this.tiles.models[t-1].trigger('clear');
				t = t - 1;
			}
			this.tiles.rows = this.model.get('width') / TILE_SIZE;
			this.tiles.cols = this.model.get('height') / TILE_SIZE;

			// update tiles
			var count = 1;

			for (var i=1; i<=this.tiles.cols; i++) {
				for (var j=1; j<=this.tiles.rows; j++) {
					var tile = this.tiles.get(count);
					if (tile) {
						tile.set({ row: j, col: i });
						tile.set({ imgUrl : constructTileImageUrl(tile, zoomlevel) });					
					}
					else {
						// console.log('creating new tile #', count);
						tile = new Tile({ id: count, col: i, row: j });
						tile.setImageUrlForZoom(zoomlevel);
						this.tiles.add(tile);						
					}
					count++;
				}
			}
			// reposition canvas
			var zoomDelta = ow / cw;
			if (zoomDelta < 1) {		// zoomed in
				var leftPos = this.model.get('left') - ow / 2;
				var topPos = this.model.get('top') - oh / 2;
			}
			else {				// zoomed out
				var leftPos = this.model.get('left') + ow / 4;
				var topPos = this.model.get('top') + oh / 4;
			}
			this.model.set({
				left: leftPos,
				top : topPos
			 });
		},
		render : function () {
			// console.log('rendering canvasView');
			var $this = $(this.el);
			$this.css({
				'width' : this.model.get('width'),
				'height': this.model.get('height'),
				'left'  : this.model.get('left'),
				'top'	: this.model.get('top') 
			});
			return this;
		}
	});


	/* Private variables */
	var TILE_SIZE = 256;
	var TILES_BASE_URL = 'img/';
	var BLANK_IMAGE_URL = 'img/blank.png';
	var MAX_ZOOMLEVEL = 4;
	var mapView;
	var opts;
	var $panofv;

	var	constructTileImageUrl = function (tile, zoomlevel) {
			if (opts.mapId) {
				var r = ("000" + (tile.get('row') - 1)).match(/...$/)[0];
				var c = ("000" + (tile.get('col') - 1)).match(/...$/)[0];
				var z = ("000" + (MAX_ZOOMLEVEL - zoomlevel)).match(/...$/)[0];
				return [TILES_BASE_URL, 'tile_', z, '_', r, '_', c, '.jpg'].join('');
			}
			else {
				return BLANK_IMAGE_URL;
			}
	};


	$.fn.panofv = function(options) {
		// build main options before element iteration
		opts = $.extend({}, options);
		TILES_BASE_URL = TILES_BASE_URL + opts.mapId + '/';

		return this.each(function() {	// iterate and reformat each matched element
			var $this = $(this);
			$panofv = $this;

			// create the map view and map model
			mapView = new MapView({
				el: $this
			});

			// create the canvas view and canvas model
			// calculate optimum zoom level for current w and h
			var w = $this.width();
			var h = $this.height();
			var z = Math.floor(Math.log(2 * Math.min(w, h) / TILE_SIZE) / Math.log(2));
			(z == 0) ? z = 1 : z;
			//z = 2; 	// force default zoom level
			var cw = TILE_SIZE * Math.pow(2, z - 1);	// canvas is always a square
			var ch = TILE_SIZE * Math.pow(2, z - 1);	// canvas is always a square
			var l = (w - cw) / 2; 		// for centering map in canvas
			var t = (h - ch) / 2;		// for centering map in canvas
			var canvas = new Canvas({
				zoomlevel : z,
				width: cw,
				height: ch,
				mapWidth: w,
				mapHeight: h,
				left: l,
				top: t
			});

			// set the following for interaction with fanvenues plugin
			mapView.model.set({ 
				zoomlevel: z,
				leftPos: l,
				topPos: t
			});

			var canvasView = new CanvasView({
				model : canvas
			});

			canvasView.tiles = new Tiles();
			canvasView.tiles.baseUrl = TILES_BASE_URL;
			canvasView.tiles.rows = canvas.get('width') / TILE_SIZE;
			canvasView.tiles.cols = canvas.get('height') / TILE_SIZE;

			canvasView.tiles.bind("add", function (tile) {
				// console.log('adding tile #', tile.get('id'));
				$(canvasView.el).append($(tile.view.el));
			});
			/*
			canvasView.tiles.bind("remove", function (tile) {
				// console.log('<<<<<<____________deleting tile #',tile.get('id'));
				tile.view.model = null;
				$(tile.view.el).find('img').remove();
				$(tile.view.el).remove();
				tile.view = null;
				tile.set({ imgUrl : BLANK_IMAGE_URL });
			});
			*/

			// create tiles
			var count = 1;
			// console.log('cols,rows=',canvasView.tiles.cols,canvasView.tiles.rows);
			for (var i=1; i<=canvasView.tiles.cols; i++) {
				for (var j=1; j<=canvasView.tiles.rows; j++) {
					if (tile = canvasView.tiles.get(count)) {
						tile.set({ row: j, col: i });
						tile.trigger('update'); // update tile's image element
					}
					else {
						// console.log('creating new tile #', count);
						var tile = new Tile({ id: count, col: i, row: j });
						tile.setImageUrlForZoom(canvas.get('zoomlevel'));
						canvasView.tiles.add(tile);						
					}
					count++;
				}
			}

			canvas
				.bind("change:left", canvasView.updatePos)
				.bind("change:top", canvasView.updatePos)
				.bind("change:width", canvasView.updateSize)
				.bind("change:height", canvasView.updateSize)
				.bind("change:zoomlevel", canvasView.reposition);

			mapView
				.bind('zoomIn', canvas.zoomIn)
				.bind('zoomOut', canvas.zoomOut)
				.bind('center', canvas.center);
				
			mapView.model.bind("change:mouseMoveCoord", function () {
				var l = canvas.get('left') + mapView.model.get('mouseMoveCoord').x - mapView.model.get('mouseOrigCoord').x;
				var t = canvas.get('top') + mapView.model.get('mouseMoveCoord').y - mapView.model.get('mouseOrigCoord').y;		
				canvas.set({ left : l, top : t });
			});
			mapView.model.bind("change:mouseWheelDelta", function () {
				var l = canvas.get('left') + mapView.model.get('mouseWheelDelta').x;
				var t = canvas.get('top') + mapView.model.get('mouseWheelDelta').y;
				canvas.set({ left : l, top : t });
			});

			var $canvasViewEl = $(canvasView.render().el);
			$(mapView.el).append($canvasViewEl);
		});
	};


	
	//
	// public functions
	//

	$.fn.panofv.getTileSize = function () {
		return TILE_SIZE;
	};

	$.fn.panofv.getZoom = function () {
		return mapView.model.get('zoomlevel');
	};

	$.fn.panofv.getLeft = function () {
		return mapView.model.get('leftPos');	
	};

	$.fn.panofv.getTop = function () {
		return mapView.model.get('topPos');	
	};

	$.fn.panofv.center = function () {
		mapView.trigger('center');
	};

	$.fn.panofv.zoomIn = function () {
		mapView.trigger('zoomIn');
	};

	$.fn.panofv.zoomOut = function () {
		mapView.trigger('zoomOut');
	};

})(jQuery);

