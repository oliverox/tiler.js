 /**********************************************************************************************************
 Copyright (c) 2010 Peekspy Pte Ltd <http://www.peekspy.com>
 Used by Fanvenues 3D Interactive Seating Maps <http://www.fanvenues.com>
 Plugin: jquery.tiler.js
 Description: lines up a tiled image in a grid for easy panning/zooming.
 Prerequisite libraries: Backbone.js, jQuery.js
 Author: Oliver Oxenham
 Date created: 2011-09-11
 Date updated: 2011-09-11
 Latest version: 1.0.0
 1.0.0 : tiler.js created on Git.
***********************************************************************************************************/
(function($){

	var Pic = Backbone.Model.extend({
		defaults: {
			width : 500,
			height: 500,
			mouseWheelDelta: { x : 0, y : 0 },
			mouseOrigCoord : { x : 0, y : 0 },
			mouseMoveCoord : { x : 0, y : 0 },
			mousepressed: false
		},
		initialize: function () {
			_.bindAll(this);
			console.log('creating new pic:', this.get('width'), this.get('height'));
		}
	});

	var PicView = Backbone.View.extend({
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
			//console.log('this.el=', $(this.el));
			var w = $(this.el).width();
			var h = $(this.el).height(); 
			this.model = new Pic({
				width: w,
				height: h
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
		cols: 1,
		renderTilesInView: function (left, top, zoomlevel) {
			
		}
	});

	var Tile = Backbone.Model.extend({
		defaults: {
			imgUrl		: '',
			inViewport 	: false,
			row 		: 0,
			col 		: 0,
			width 		: 256,
			height 		: 256
		},
		initialize: function () {
			this.view = new TileView({ model: this });
			this.bind("change:imgUrl", this.view.render);
			this.bind("clear", function () {
				console.log('<<<<<< clearing tile #',this.get('id'));
				this.set({ imgUrl : opts.blank_image_url });
			});

		},
		setImageUrlForZoom : function (zoomlevel) {
			console.log('setting image for tile', this.get('id'), 'with zoomlevel:', zoomlevel);
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
				width : opts.tile_size,
				height: opts.tile_size
			});
		},
		render : function () {
			console.log('rendering tile', this.model);
			var $this = $(this.el);
			var imgEl;
			var img = $this.find('img');
			if (img.length > 0) {	// reuse img element
				imgEl = img;
			}
			else {
				imgEl = $('<img/>');
				$this.append(imgEl);
			}
			imgEl.attr({
				src    : this.model.get('imgUrl')
			});
			img = null;
			imgEl = null;
			return this;
		}
	});

	// a canvas is simply a Tile container
	// canvas size depends on current zoom level (== size of pic at this zoom level)
	// canvas size = current tilesize * 2 ^ (zoomlevel - 1) 
	var Canvas = Backbone.Model.extend({
		defaults: {
			zoomlevel 	: 1,
			left 		: 0,
			top 		: 0
		},
		initialize: function () {
			_.bindAll(this);
			console.log('creating new canvas with:', 'w=', this.get('width'), 'h=', this.get('height'),'z=', this.get('zoomlevel'));
		},
		center: function () {
			var l = (this.get('picwidth') - this.get('width')) / 2; 		// for centering pic in canvas
			var t = (this.get('picheight') - this.get('height')) / 2;		// for centering pic in canvas
			this.set({left: l, top: t});
		},
		zoomIn : function () {
			if (this.get('zoomlevel') < opts.max_zoomlevel) {
				this.set({ zoomlevel: this.get('zoomlevel') + 1 });
				picView.model.set({ zoomlevel: this.get('zoomlevel') });
			}
			else
				alert('cannot zoom in further');
		},
		zoomOut : function () {
			console.log('zooming out canvas');
			if (this.get('zoomlevel') > 1) {
				this.set({zoomlevel: this.get('zoomlevel') - 1});
				picView.model.set({ zoomlevel: this.get('zoomlevel') });
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
			// render tiles in view
			this.tiles.renderTilesInView();

			// also update picView
			picView.model.set({
				leftPos: this.model.get('left'),
				topPos : this.model.get('top')
			});
			// trigger tiler move event
			$tiler.trigger('tilerOnMove');		// external bind event to be implemented by customer
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
			var cw = opts.tile_size * Math.pow(2, zoomlevel - 1);	// canvas is always a square
			var ch = opts.tile_size * Math.pow(2, zoomlevel - 1);	// canvas is always a square
			console.log('setting canvas size to:', cw, ch);
			this.model.set({ width: cw, height: ch });

			// clear all excess tiles
			var totalTilesRequired = Math.pow(cw / opts.tile_size, 2);
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
			this.tiles.rows = this.model.get('width') / opts.tile_size;
			this.tiles.cols = this.model.get('height') / opts.tile_size;

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
						console.log('creating new tile #', count);
						tile = new Tile({ 
							id: count, 
							col: i, 
							row: j,
							width: opts.tile_size,
							height: opts.tile_size 
						});
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
			console.log('rendering canvasView');
			var $this = $(this.el);
			$this.css({
				'width' : this.model.get('width'),
				'height': this.model.get('height'),
				'left'  : this.model.get('left'),
				'top'	: this.model.get('top') 
			});
			console.log('canvas w,h=', this.model.get('width'), this.model.get('height'));
			return this;
		}
	});


	/* Private variables */
	var picView;
	var opts;
	var $tiler;

	var	constructTileImageUrl = function (tile, zoomlevel) {
		var r = ("000" + (tile.get('row') - 1)).match(/...$/)[0];
		var c = ("000" + (tile.get('col') - 1)).match(/...$/)[0];
		var z = ("000" + (opts.max_zoomlevel - zoomlevel)).match(/...$/)[0];
		return [opts.tiles_base_url, 'tile_', z, '_', r, '_', c, '.jpg'].join('');
	};


	$.fn.tiler = function(options) {
		// build main options before element iteration
		opts = $.extend({
			tiles_base_url 	: 'tiles/',
			tile_size 		: 256,
			blank_image_url : 'img/blank.gif',
			max_zoomlevel 	: 4
		}, options);

		return this.each(function() {	// iterate and reformat each matched element
			var $this = $(this);
			$tiler = $this;

			// create the pic view and pic model
			picView = new PicView({ el: $this });

			// create the canvas view and canvas model
			// calculate optimum zoom level for current w and h
			var w = $this.width();
			var h = $this.height();
			var z = Math.floor(Math.log(2 * Math.min(w, h) / opts.tile_size) / Math.log(2));
			(z == 0) ? z = 1 : z;
			//z = 2; 	// force default zoom level
			var cw = opts.tile_size * Math.pow(2, z - 1);	// canvas is always a square
			var ch = opts.tile_size * Math.pow(2, z - 1);	// canvas is always a square
			var l = (w - cw) / 2; 		// for centering pic in canvas
			var t = (h - ch) / 2;		// for centering pic in canvas
			var canvas = new Canvas({
				zoomlevel : z,
				width: cw,
				height: ch,
				picwidth: w,
				picheight: h,
				left: l,
				top: t
			});

			// set the following for interaction with fanvenues plugin
			picView.model.set({ 
				zoomlevel: z,
				leftPos: l,
				topPos: t
			});

			var canvasView = new CanvasView({
				model : canvas
			});

			canvasView.tiles = new Tiles();
			canvasView.tiles.baseUrl = opts.tiles_base_url;
			canvasView.tiles.rows = canvas.get('width') / opts.tile_size;
			canvasView.tiles.cols = canvas.get('height') / opts.tile_size;

			canvasView.tiles.bind("add", function (tile) {
				console.log('adding tile #', tile.get('id'));
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
			console.log('cols,rows=',canvasView.tiles.cols,canvasView.tiles.rows);
			canvasView.tiles.renderTilesInView();

			for (var i=1; i<=canvasView.tiles.cols; i++) {
				for (var j=1; j<=canvasView.tiles.rows; j++) {
					if (tile = canvasView.tiles.get(count)) {
						tile.set({ row: j, col: i });
						//tile.trigger('update'); // update tile's image element
					}
					else {
						console.log('creating new tile #', count);
						var tile = new Tile({ 
							id: count, 
							col: i, 
							row: j,
							width: opts.tile_size,
							height: opts.tile_size
						 });
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

			picView
				.bind('zoomIn', canvas.zoomIn)
				.bind('zoomOut', canvas.zoomOut)
				.bind('center', canvas.center);
				
			picView.model.bind("change:mouseMoveCoord", function () {
				var l = canvas.get('left') + picView.model.get('mouseMoveCoord').x - picView.model.get('mouseOrigCoord').x;
				var t = canvas.get('top') + picView.model.get('mouseMoveCoord').y - picView.model.get('mouseOrigCoord').y;		
				canvas.set({ left : l, top : t });
			});
			picView.model.bind("change:mouseWheelDelta", function () {
				var l = canvas.get('left') + picView.model.get('mouseWheelDelta').x;
				var t = canvas.get('top') + picView.model.get('mouseWheelDelta').y;
				canvas.set({ left : l, top : t });
			});

			var $canvasViewEl = $(canvasView.render().el);
			$(picView.el).append($canvasViewEl);
		});
	};


	
	//
	// public functions
	//

	$.fn.tiler.getTileSize = function () {
		return opts.tile_size;
	};

	$.fn.tiler.getZoom = function () {
		return picView.model.get('zoomlevel');
	};

	$.fn.tiler.getLeft = function () {
		return picView.model.get('leftPos');	
	};

	$.fn.tiler.getTop = function () {
		return picView.model.get('topPos');	
	};

	$.fn.tiler.center = function () {
		picView.trigger('center');
	};

	$.fn.tiler.zoomIn = function () {
		picView.trigger('zoomIn');
	};

	$.fn.tiler.zoomOut = function () {
		picView.trigger('zoomOut');
	};

})(jQuery);