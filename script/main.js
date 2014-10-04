require(['jquery', 'imgcrypt'], function($, imgcrypt){ $(function(){
//////////////////////////////////////////////////////////////////////////////

$('#loading').hide();
$('#loaded').show();

/****************************************************************************/
var Canvas2Image = (function() {

	// check if we have canvas support
	var bHasCanvas = false;
	var oCanvas = document.createElement("canvas");
	if (oCanvas.getContext("2d")) {
		bHasCanvas = true;
	}

	// no canvas, bail out.
	if (!bHasCanvas) {
		return {
			saveAsPNG : function(){},
			saveAsJPEG : function(){}
		}
	}

	var bHasImageData = !!(oCanvas.getContext("2d").getImageData);
	var bHasDataURL = !!(oCanvas.toDataURL);
	var bHasBase64 = !!(window.btoa);

	var strDownloadMime = "image/octet-stream";

	// ok, we're good
	var readCanvasData = function(oCanvas) {
		var iWidth = parseInt(oCanvas.width);
		var iHeight = parseInt(oCanvas.height);
		return oCanvas.getContext("2d").getImageData(0,0,iWidth,iHeight);
	}

	// base64 encodes either a string or an array of charcodes
	var encodeData = function(data) {
		var strData = "";
		if (typeof data == "string") {
			strData = data;
		} else {
			var aData = data;
			for (var i=0;i<aData.length;i++) {
				strData += String.fromCharCode(aData[i]);
			}
		}
		return btoa(strData);
	}

	// sends the generated file to the client
	var saveFile = function(strData) {
		document.location.href = strData;
	}

	var makeDataURI = function(strData, strMime) {
		return "data:" + strMime + ";base64," + strData;
	}

	// generates a <img> object containing the imagedata
	var makeImageObject = function(strSource) {
		var oImgElement = document.createElement("img");
		oImgElement.src = strSource;
		return oImgElement;
	}

	var scaleCanvas = function(oCanvas, iWidth, iHeight) {
		if (iWidth && iHeight) {
			var oSaveCanvas = document.createElement("canvas");
			oSaveCanvas.width = iWidth;
			oSaveCanvas.height = iHeight;
			oSaveCanvas.style.width = iWidth+"px";
			oSaveCanvas.style.height = iHeight+"px";

			var oSaveCtx = oSaveCanvas.getContext("2d");

			oSaveCtx.drawImage(oCanvas, 0, 0, oCanvas.width, oCanvas.height, 0, 0, iWidth, iHeight);
			return oSaveCanvas;
		}
		return oCanvas;
	}

	return {

		saveAsPNG : function(oCanvas, bReturnImg, iWidth, iHeight) {
			if (!bHasDataURL) {
				return false;
			}
			var oScaledCanvas = scaleCanvas(oCanvas, iWidth, iHeight);
			var strData = oScaledCanvas.toDataURL("image/png");
			if (bReturnImg) {
				return makeImageObject(strData);
			} else {
				saveFile(strData.replace("image/png", strDownloadMime));
			}
			return true;
		},

		saveAsJPEG : function(oCanvas, bReturnImg, iWidth, iHeight) {
			if (!bHasDataURL) {
				return false;
			}

			var oScaledCanvas = scaleCanvas(oCanvas, iWidth, iHeight);
			var strMime = "image/jpeg";
			var strData = oScaledCanvas.toDataURL(strMime);
	
			// check if browser actually supports jpeg by looking for the mime type in the data uri.
			// if not, return false
			if (strData.indexOf(strMime) != 5) {
				return false;
			}

			if (bReturnImg) {
				return makeImageObject(strData);
			} else {
				saveFile(strData.replace(strMime, strDownloadMime));
			}
			return true;
		},

	};

})();

/****************************************************************************/
// for loading image
var MAX_WIDTH = 512;
function render(src){
    $('#srcimg').remove();
    $('<img>', {id: 'srcimg'}).hide().appendTo('body');
    var image = $('#srcimg')[0];
    image.onload = function(){
        var canvas = document.getElementById("preview");

        if(image.width > MAX_WIDTH) {
            image.height *= MAX_WIDTH / image.width;
            image.width = MAX_WIDTH;
        };

        image.height = Math.floor(image.height / 8) * 8;
        image.width = Math.floor(image.width / 8) * 8;

        var ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0, image.width, image.height);
    };
    image.src = src;
};

function loadImage(src){
    //	Prevent any non-image file type from being read.
    if(!src.type.match(/image.*/)){
        console.log("The dropped file is not an image: ", src.type);
        return;
    }

    //	Create our FileReader and run the results through the render function.
    var reader = new FileReader();
    reader.onload = function(e){
        render(e.target.result);
    };
    reader.readAsDataURL(src);
}

// load file via `drag and drop`
var target = document.getElementById("preview");
target.addEventListener("dragover", function(e){e.preventDefault();}, true);
target.addEventListener("drop", function(e){
    e.preventDefault(); 
    loadImage(e.dataTransfer.files[0]);
}, true);

// load file via dialog
$('#selectSrc').on('change', function(e){
    var target = e.target || window.event.srcElement,
        files = target.files;
    if(files[0]) loadImage(files[0]);
});

// load file via URl
$('#doLoadFromUrl').click(function(){
    var url = $('#loadUrl').val();
    try{
        render(url);
    } catch(e){
    };
});


/****************************************************************************/
// for encryption and decryption

function doer(reverse){
    var key = $('#password').val();
    if(!/^[a-z0-9`~!@#$%^&\*\(\)_\+\-=\[\]\{\};':",\.<>/?\\|].+$/i.test(key)){
        alert('密码不合理，请重新输入. / Invalid password, type another one again.');
        return;
    };

    var names = {
        src: 'srcCanvas',
        out: 'outCanvas',
        flipH: 'flipHCanvas',
        flipV: 'flipVCanvas',
        flipHV: 'flipHVCanvas',
    };


    $('#cache').empty()
        .append($('<canvas>', { id: 'flipHCanvas', }))
        .append($('<canvas>', { id: 'flipVCanvas', }))
        .append($('<canvas>', { id: 'flipHVCanvas', }))
    ;
    $('#result').empty()
        .append($('<canvas>', { id: 'outCanvas', }))
    ;

    $('#outCanvas').dblclick(function(){
        Canvas2Image.saveAsJPEG($('#outCanvas')[0]);
    });

    var img=$('#srcimg')[0];
/*    var url = $('#preview')[0].toDataURL();
    img.src = url;*/

    $('<canvas>', { id: 'srcCanvas', }).appendTo('#cache');
    var srcctx = $('#srcCanvas')[0].getContext('2d');
    srcctx.canvas.width = img.width;
    srcctx.canvas.height = img.height;

    var worker = imgcrypt(names).key(key);
    if(reverse)
        worker.decrypt(img);
    else
        worker.encrypt(img);
};

$('#do').click(function(){doer(false);});
$('#reverse').click(function(){doer(true);});
//////////////////////////////////////////////////////////////////////////////
}); });
