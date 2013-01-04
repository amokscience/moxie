define("runtime/html5/image/JPEG", [
			"o", 
			"runtime/html5/image/JPEGHeaders", 
			"runtime/html5/utils/BinaryReader", 
			"runtime/html5/image/ExifParser"
		], 
	function(o, JPEGHeaders, BinaryReader, ExifParser) {

	var x = o.Exceptions;

	return function JPEG(binstr) {
		var _binstr, _br, _hm, _ep, _info, hasExif;

		_binstr = binstr;

		_br = new BinaryReader();
		_br.init(_binstr);

		// check if it is jpeg
		if (_br.SHORT(0) !== 0xFFD8) {
			throw new x.ImageError(x.ImageError.WRONG_FORMAT);
		}
		
		// backup headers		
		_hm = new JPEGHeaders(binstr);

		// extract exif info
		_ep = new ExifParser;		
		hasExif = !!_ep.init(_hm.get('exif')[0]);

		// get dimensions
		_info = _getDimensions.call(this);


		o.extend(this, {

			type: 'image/jpeg',

			size: _binstr.length,

			width: _info && _info.width || 0,

			height: _info && _info.height || 0,

			setExif: function(tag, value) {
				if (!hasExif) {
					return false; // or throw an exception
				}

				if (o.typeOf(tag) === 'object') {
					o.each(tag, function(value, tag) {
						_ep.setExif(tag, value);
					});
				} else {
					_ep.setExif(tag, value);
				}

				// update internal headers
				_hm.set('exif', _ep.getBinary());
			},

			writeHeaders: function() {
				if (!arguments.length) { 
					// if no arguments passed, update headers internally
					return _binstr = _hm.restore(_binstr);
				}
				return _hm.restore(arguments[0]);
			},

			purge: function() {
				_purge.call(this);
			}
		});

		if (hasExif) {
			this.meta = {
				exif: _ep.EXIF(),
				gps: _ep.GPS()
			};
		}

		function _getDimensions() {
			var idx = 0, marker, length;
			
			// examine all through the end, since some images might have very large APP segments
			while (idx <= _binstr.length) {
				marker = _br.SHORT(idx += 2);
				
				if (marker >= 0xFFC0 && marker <= 0xFFC3) { // SOFn
					idx += 5; // marker (2 bytes) + length (2 bytes) + Sample precision (1 byte)
					return {
						height: _br.SHORT(idx),
						width: _br.SHORT(idx += 2)
					};
				}
				length = _br.SHORT(idx += 2);
				idx += length - 2;			
			}		
			return null;
		}

		function _purge() {
			_ep.purge();
			_hm.purge();
			_br.init(null);
			_hm = _ep = _br = null;
		}
	};
});
