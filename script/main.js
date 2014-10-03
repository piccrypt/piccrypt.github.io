var doer, exchange;
var loaded = false;

require(['jquery', 'imgcrypt'], function($, imgcrypt){ $(function(){
//////////////////////////////////////////////////////////////////////////////

$('#loading').hide();
$('#loaded').show();

/****************************************************************************/
// for loading image
var MAX_WIDTH = 512;
function render(src){
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
