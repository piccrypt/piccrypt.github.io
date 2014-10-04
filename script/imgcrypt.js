(function(){
//////////////////////////////////////////////////////////////////////////////

// Permutation generator
function genPermutation(n, srcBytes){
    var ret = new Array(n), byteRead = 0, pos, t;
    for(var i=0; i<n; i++) ret[i] = i;
    for(var i=0; i<n; i++){ // i: 0, 1, 2, 3,..., n-1
        pos = (
            srcBytes[byteRead++] *
            srcBytes[byteRead++] *
            srcBytes[byteRead++]
        ) % n;

        t = ret[pos];
        ret[pos] = ret[i];
        ret[i] = t;
    };
    return ret;
};

/****************************************************************************/
function massMapper(img, canvasIDs){
    var self = this;
    var gridsize = 8;

    var src = $('#' + canvasIDs.src),
        cacheH = $('#' + canvasIDs.flipH),
        cacheV = $('#' + canvasIDs.flipV),
        cacheHV = $('#' + canvasIDs.flipHV),
        out = $('#' + canvasIDs.out);
        
    var srcctx = src[0].getContext('2d'),
        cacheHctx = cacheH[0].getContext('2d'),
        cacheVctx = cacheV[0].getContext('2d'),
        cacheHVctx = cacheHV[0].getContext('2d'),
        outctx = out[0].getContext('2d');

    var width = srcctx.canvas.width, height = srcctx.canvas.height,
        w = Math.floor(width / gridsize),
        h = Math.floor(height / gridsize);

    // correct width and height that are not mutiples of gridsize
    width = w * gridsize;
    height = h * gridsize;

    function clearCtx(which){
        which.scale(1,1);
        which.canvas.width = width;
        which.canvas.height = height;
        which.clearRect(0, 0, width, height);
    };
    clearCtx(outctx);
    clearCtx(cacheHctx);
    clearCtx(cacheVctx);
    clearCtx(cacheHVctx);

    function flipImage(ctx, flipH, flipV) {
        var scaleH = flipH ? -1 : 1, // Set horizontal scale to -1 if flip horizontal
            scaleV = flipV ? -1 : 1, // Set verical scale to -1 if flip vertical
            posX = flipH ? width * -1 : 0, // Set x position to -100% if flip horizontal 
            posY = flipV ? height * -1 : 0; // Set y position to -100% if flip vertical
        
        ctx.save(); // Save the current state
        ctx.scale(scaleH, scaleV); // Set scale to flip the image
        ctx.drawImage(img, posX, posY, width, height); // draw the image
        ctx.restore(); // Restore the last saved state
    };

    flipImage(srcctx, false, false);
    flipImage(cacheHctx, true, false);
    flipImage(cacheVctx, false, true);
    flipImage(cacheHVctx, true, true);

    // draw 2 color blocks

    outctx.beginPath();
    outctx.rect(0, 0, gridsize, gridsize)
    outctx.fillStyle='blue';
    outctx.fill();

    outctx.beginPath();
    outctx.rect((w-1) * gridsize,(h-1) * gridsize, gridsize, gridsize)
    outctx.fillStyle='red';
    outctx.fill();

    // generate cellID->(x,y) table
    var table = {}, cellID = 0;
    for(var y=0; y<h; y++)
        for(var x=0; x<w; x++)
            table[cellID++] = [x, y];

    // prepare task
    var task = [];

    this.getPermutationRequirement = function(){
        return h * w;
    };

    this.getBytesRequirement = function(){
        return h * w * 3;
    };

    this.getTransformRequirement = function(){
        return h * w;
    };

    /********************************************************************/
    /* switch and process the grid.
     *
     * data from src is copied to a 256-byte array, and will be processed.
     * then it will be applied to the output canvas.
     */

    var canvasSrcData = srcctx.getImageData(0, 0, width, height),
        canvasOutData = outctx.getImageData(0, 0, width, height),
        gridDataLen = 4 * gridsize * gridsize;
        srcTempAry = new Uint8Array(gridDataLen),
        outTempAry = new Uint8Array(gridDataLen);

    function getArrayFromSrc(sid, resultAry){
        /*
         * +++++++++++++++++++++++++++++++++++++++++++++++++++++
         * +++++++++++++++++++++++++++++++++++++++++++++++++++++
         * +++++++++++++++++++++++++++++++++++++++++++++++++++++
         * ++++++++AXXXXX  <-- position of A: decided by pixels above and left
         * ++++++++BXXXXX  <-- position of B: equals A's index plus row length
         * ++++++++XXXXXX
         */
        var rowDataLen = width * 4,
            start = table[sid][1] * gridsize * rowDataLen
                  + table[sid][0] * gridsize * 4,
            i = 0, t, x, y, p;
        for(y=0; y<gridsize; y++){
            t = start;
            for(x=0; x<gridsize; x++){
                for(p=0; p<4; p++){
                    resultAry[i++] = canvasSrcData.data[t++];
                };
            };
            start += rowDataLen; // move to begin of the next row
        };
    };

    function applyArrayToOut(oid, sourceAry){
        var rowDataLen = width * 4,
            start = table[oid][1] * gridsize * rowDataLen
                  + table[oid][0] * gridsize * 4,
            i = 0, t, x, y, p;
        for(y=0; y<gridsize; y++){
            t = start;
            for(x=0; x<gridsize; x++){
                for(p=0; p<4; p++){
                    canvasOutData.data[t++] = sourceAry[i++];
                };
            };
            start += rowDataLen; // move to begin of the next row
        };
    };

    this.add = function(sid, hflip, vflip, invert, oid){
        getArrayFromSrc(sid, srcTempAry);

        // do convert from srcTempAry to outTempAry
        for(var i=0; i<srcTempAry.length; i++)
            outTempAry[i] = srcTempAry[i];

        applyArrayToOut(oid, outTempAry);
    };

    this.end = function(){
        outctx.putImageData(canvasOutData, 0, 0);
    };
    

    return this;
};

/****************************************************************************/
function imgcrypt(crypto, $, canvasIDs){
    var self = this;

    var key = null;

    function getBytes(l, s){
        var salt ={
            0: crypto.util.encoding('permutation', 'ascii').toArrayBuffer(),
            1: crypto.util.encoding('transformation', 'ascii').toArrayBuffer(),
        }[s];
        var ret = new crypto.hash('WHIRLPOOL').pbkdf2(
            key,
            salt,
            1,
            l
        );
        return new Uint8Array(ret);
    };


    function _crypt(img, reverse){
        var mapper = new massMapper(img, canvasIDs);
        var byteL = mapper.getBytesRequirement(),
            permL = mapper.getPermutationRequirement();
        var ary = getBytes(byteL, 0);
        var permutation = genPermutation(permL, ary);
        var transformation = getBytes(mapper.getTransformRequirement(), 1);

        // permutation is regarded as so:
        // 
        // source:  1....2....3....4....5
        // permu.:  5....3....2....1....4
        //
        // so 1->5, 2->3, 3->2, 4->1, 5->4 for encryption
        //    5->1, 3->2, 2->3, 1->4, 4->5 for decryption
        //
        // mapper accepts a hflip option, which, when given, will read in a
        // horizontal flipped image.
        if(reverse){
            for(var i=0; i<permL; i++){
                mapper.add(
                    permutation[i],
                    transformation[i] & 1, // hflip
                    transformation[i] & 2, // vflip
                    (transformation[i] & 28) >> 2, // inverted color, 3bits
                    i
                );
            };
        } else {
            for(var i=0; i<permL; i++){
                mapper.add(
                    i,
                    transformation[i] & 1, // hflip
                    transformation[i] & 2, // vflip
                    (transformation[i] & 28) >> 2, // inverted color, 3bits
                    permutation[i]
                );
            };
        };

        mapper.end();
    };

    function encrypt(img){
        _crypt(img, false);
    };

    function decrypt(img){
        _crypt(img, true);
    };

    this.key = function(k){
        key = crypto.util.encoding(k, 'ascii').toArrayBuffer();
        delete self.key;
        self.encrypt = encrypt;
        self.decrypt = decrypt;
        return self;
    };

    return this;
};


/****************************************************************************/

define(['crypto', 'jquery'], function(crypto, $){
    return function(canvasIDs){
        return new imgcrypt(crypto, $, canvasIDs);
    };
});

//////////////////////////////////////////////////////////////////////////////
})();
