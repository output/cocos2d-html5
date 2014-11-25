/****************************************************************************
 Copyright (c) 2013-2014 Chukong Technologies Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * cc.ProgressTimer's rendering objects of Canvas
 */
(function(){
    cc.ProgressTimer.CanvasRenderCmd = function(renderableObject){
        cc.Node.CanvasRenderCmd.call(this, renderableObject);
        this._needDraw = true;

        this._PI180 = Math.PI / 180;
        this._barRect = cc.rect(0, 0, 0, 0);
        this._origin = cc.p(0, 0);
        this._radius = 0;
        this._startAngle = 270;
        this._endAngle = 270;
        this._counterClockWise = false;
    };

    var proto = cc.ProgressTimer.CanvasRenderCmd.prototype = Object.create(cc.Node.CanvasRenderCmd.prototype);
    proto.constructor = cc.ProgressTimer.CanvasRenderCmd;

    proto.rendering = function (ctx, scaleX, scaleY) {
        var context = ctx || cc._renderContext, node = this._node, locSprite = node._sprite;

        var locTextureCoord = locSprite._renderCmd._textureCoord, alpha = locSprite._displayedOpacity / 255;

        if (locTextureCoord.width === 0 || locTextureCoord.height === 0)
            return;
        if (!locSprite._texture || !locTextureCoord.validRect || alpha === 0)
            return;

        var t = this._worldTransform;
        context.save();
        context.transform(t.a, t.c, t.b, t.d, t.tx * scaleX, -t.ty * scaleY);

        if (locSprite._blendFuncStr != "source-over")
            context.globalCompositeOperation = locSprite._blendFuncStr;
        context.globalAlpha = alpha;

        var locRect = locSprite._rect, locOffsetPosition = locSprite._offsetPosition;
        var locX = locOffsetPosition.x,
            locY = -locOffsetPosition.y - locRect.height,
            locWidth = locRect.width,
            locHeight = locRect.height;

        if (locSprite._flippedX) {
            locX = -locX - locWidth;
            context.scale(-1, 1);
        }
        if (locSprite._flippedY) {
            locY = locOffsetPosition.y;
            context.scale(1, -1);
        }

        //clip
        if (node._type == cc.ProgressTimer.TYPE_BAR) {
            var locBarRect = this._barRect;
            context.beginPath();
            context.rect(locBarRect.x * scaleX, locBarRect.y * scaleY, locBarRect.width * scaleX, locBarRect.height * scaleY);
            context.clip();
            context.closePath();
        } else if (node._type == cc.ProgressTimer.TYPE_RADIAL) {
            var locOriginX = this._origin.x * scaleX;
            var locOriginY = this._origin.y * scaleY;
            context.beginPath();
            context.arc(locOriginX, locOriginY, this._radius * scaleY, this._PI180 * this._startAngle, this._PI180 * this._endAngle, this._counterClockWise);
            context.lineTo(locOriginX, locOriginY);
            context.clip();
            context.closePath();
        }

        //draw sprite
        var image = locSprite._texture.getHtmlElementObj();
        if (locSprite._colorized) {
            context.drawImage(image,
                0,
                0,
                locTextureCoord.width,
                locTextureCoord.height,
                locX * scaleX,
                locY * scaleY,
                locWidth * scaleX,
                locHeight * scaleY
            );
        } else {
            context.drawImage(image,
                locTextureCoord.renderX,
                locTextureCoord.renderY,
                locTextureCoord.width,
                locTextureCoord.height,
                locX * scaleX,
                locY * scaleY,
                locWidth * scaleX,
                locHeight * scaleY
            );
        }

        context.restore();
        cc.g_NumberOfDraws++;
    };

    proto.releaseData = function(){};

    proto.initCmd = function(){};

    proto._updateProgress = function(){
        var node = this._node;
        var locSprite = node._sprite;
        var sw = locSprite.width, sh = locSprite.height;
        var locMidPoint = node._midPoint;

        if (node._type == cc.ProgressTimer.TYPE_RADIAL) {
            this._radius = Math.round(Math.sqrt(sw * sw + sh * sh));
            var locStartAngle, locEndAngle, locCounterClockWise = false, locOrigin = this._origin;
            locOrigin.x = sw * locMidPoint.x;
            locOrigin.y = -sh * locMidPoint.y;

            if (node._reverseDirection) {
                locEndAngle = 270;
                locStartAngle = 270 - 3.6 * node._percentage;
            } else {
                locStartAngle = -90;
                locEndAngle = -90 + 3.6 * node._percentage;
            }

            if (locSprite._flippedX) {
                locOrigin.x -= sw * (node._midPoint.x * 2);
                locStartAngle= -locStartAngle;
                locEndAngle= -locEndAngle;
                locStartAngle -= 180;
                locEndAngle -= 180;
                locCounterClockWise = !locCounterClockWise;
            }
            if (locSprite._flippedY) {
                locOrigin.y+=sh*(node._midPoint.y*2);
                locCounterClockWise = !locCounterClockWise;
                locStartAngle= -locStartAngle;
                locEndAngle= -locEndAngle;
            }

            this._startAngle = locStartAngle;
            this._endAngle = locEndAngle;
            this._counterClockWise = locCounterClockWise;
        } else {
            var locBarChangeRate = node._barChangeRate;
            var percentageF = node._percentage / 100;
            var locBarRect = this._barRect;

            var drewSize = cc.size((sw * (1 - locBarChangeRate.x)), (sh * (1 - locBarChangeRate.y)));
            var drawingSize = cc.size((sw - drewSize.width) * percentageF, (sh - drewSize.height) * percentageF);
            var currentDrawSize = cc.size(drewSize.width + drawingSize.width, drewSize.height + drawingSize.height);

            var startPoint = cc.p(sw * locMidPoint.x, sh * locMidPoint.y);

            var needToLeft = startPoint.x - currentDrawSize.width / 2;
            if ((locMidPoint.x > 0.5) && (currentDrawSize.width / 2 >= sw - startPoint.x))
                needToLeft = sw - currentDrawSize.width;

            var needToTop = startPoint.y - currentDrawSize.height / 2;
            if ((locMidPoint.y > 0.5) && (currentDrawSize.height / 2 >= sh - startPoint.y))
                needToTop = sh - currentDrawSize.height;

            //left pos
            locBarRect.x = 0;
            var flipXNeed = 1;
            if (locSprite._flippedX) {
                locBarRect.x -= currentDrawSize.width;
                flipXNeed = -1;
            }

            if (needToLeft > 0)
                locBarRect.x += needToLeft * flipXNeed;

            //right pos
            locBarRect.y = 0;
            var flipYNeed = 1;
            if (locSprite._flippedY) {
                locBarRect.y += currentDrawSize.height;
                flipYNeed = -1;
            }

            if (needToTop > 0)
                locBarRect.y -= needToTop * flipYNeed;

            //clip width and clip height
            locBarRect.width = currentDrawSize.width;
            locBarRect.height = -currentDrawSize.height;
        }
    };

    proto._updateColor = function(){};
})();


/**
 * cc.ProgressTimer's rendering objects of WebGL
 */
(function(){
    cc.ProgressTimer.WebGLRenderCmd = function(renderableObject){
        cc.Node.WebGLRenderCmd.call(this, renderableObject);
        this._needDraw = true;

        this._vertexWebGLBuffer = cc._renderContext.createBuffer();
        this._vertexDataCount = 0;
        this._vertexData = null;
        this._vertexArrayBuffer = null;
        this._vertexDataDirty = false;
    };

    var proto = cc.ProgressTimer.WebGLRenderCmd.prototype = Object.create(cc.Node.WebGLRenderCmd.prototype);
    proto.constructor = cc.ProgressTimer.WebGLRenderCmd;

    proto.rendering = function (ctx) {
        var node = this._node;
        var context = ctx || cc._renderContext;
        if (!this._vertexData || !node._sprite)
            return;

        this._shaderProgram.use();
        this._shaderProgram._setUniformForMVPMatrixWithMat4(this._stackMatrix);

        var blendFunc = node._sprite._blendFunc;
        cc.glBlendFunc(blendFunc.src, blendFunc.dst);
        cc.glEnableVertexAttribs(cc.VERTEX_ATTRIB_FLAG_POS_COLOR_TEX);

        cc.glBindTexture2D(node._sprite.texture);

        context.bindBuffer(context.ARRAY_BUFFER, this._vertexWebGLBuffer);
        if (this._vertexDataDirty) {
            context.bufferData(context.ARRAY_BUFFER, this._vertexArrayBuffer, context.DYNAMIC_DRAW);
            this._vertexDataDirty = false;
        }
        var locVertexDataLen = cc.V2F_C4B_T2F.BYTES_PER_ELEMENT;
        context.vertexAttribPointer(cc.VERTEX_ATTRIB_POSITION, 2, context.FLOAT, false, locVertexDataLen, 0);
        context.vertexAttribPointer(cc.VERTEX_ATTRIB_COLOR, 4, context.UNSIGNED_BYTE, true, locVertexDataLen, 8);
        context.vertexAttribPointer(cc.VERTEX_ATTRIB_TEX_COORDS, 2, context.FLOAT, false, locVertexDataLen, 12);

        if (node._type === cc.ProgressTimer.TYPE_RADIAL)
            context.drawArrays(context.TRIANGLE_FAN, 0, this._vertexDataCount);
        else if (node._type == cc.ProgressTimer.TYPE_BAR) {
            if (!node._reverseDirection)
                context.drawArrays(context.TRIANGLE_STRIP, 0, this._vertexDataCount);
            else {
                context.drawArrays(context.TRIANGLE_STRIP, 0, this._vertexDataCount / 2);
                context.drawArrays(context.TRIANGLE_STRIP, 4, this._vertexDataCount / 2);
                // 2 draw calls
                cc.g_NumberOfDraws++;
            }
        }
        cc.g_NumberOfDraws++;
    };

    proto.releaseData = function(){
        if (this._vertexData) {
            //release all previous information
            this._vertexData = null;
            this._vertexArrayBuffer = null;
            this._vertexDataCount = 0;
        }
    };

    proto.initCmd = function(){
        this._vertexData = null;
        this._vertexArrayBuffer = null;
        this._vertexDataCount = 0;

        //shader program
        this._shaderProgram = cc.shaderCache.programForKey(cc.SHADER_POSITION_TEXTURECOLOR);
    };

    proto.draw = function(ctx){
        var node = this._node;
        var context = ctx || cc._renderContext;
        if (!this._vertexData || !node._sprite)
            return;

        cc.nodeDrawSetup(node);

        var blendFunc = node._sprite.getBlendFunc();
        cc.glBlendFunc(blendFunc.src, blendFunc.dst);
        cc.glEnableVertexAttribs(cc.VERTEX_ATTRIB_FLAG_POS_COLOR_TEX);

        cc.glBindTexture2D(node._sprite.texture);

        context.bindBuffer(context.ARRAY_BUFFER, this._vertexWebGLBuffer);
        if(this._vertexDataDirty){
            context.bufferData(context.ARRAY_BUFFER, this._vertexArrayBuffer, context.DYNAMIC_DRAW);
            this._vertexDataDirty = false;
        }
        var locVertexDataLen = cc.V2F_C4B_T2F.BYTES_PER_ELEMENT;
        context.vertexAttribPointer(cc.VERTEX_ATTRIB_POSITION, 2, context.FLOAT, false, locVertexDataLen, 0);
        context.vertexAttribPointer(cc.VERTEX_ATTRIB_COLOR, 4, context.UNSIGNED_BYTE, true, locVertexDataLen, 8);
        context.vertexAttribPointer(cc.VERTEX_ATTRIB_TEX_COORDS, 2, context.FLOAT, false, locVertexDataLen, 12);

        if (node._type === cc.ProgressTimer.TYPE_RADIAL)
            context.drawArrays(context.TRIANGLE_FAN, 0, this._vertexDataCount);
        else if (node._type == cc.ProgressTimer.TYPE_BAR) {
            if (!node._reverseDirection)
                context.drawArrays(context.TRIANGLE_STRIP, 0, this._vertexDataCount);
            else {
                context.drawArrays(context.TRIANGLE_STRIP, 0, this._vertexDataCount / 2);
                context.drawArrays(context.TRIANGLE_STRIP, 4, this._vertexDataCount / 2);
                // 2 draw calls
                cc.g_NumberOfDraws++;
            }
        }
        cc.g_NumberOfDraws++;
    };

    proto._updateProgress = function(){
        var node = this._node;
        var locType = node._type;
        if(locType === cc.ProgressTimer.TYPE_RADIAL)
            node._updateRadial();
        else if(locType === cc.ProgressTimer.TYPE_BAR)
            node._updateBar();
        this._vertexDataDirty = true;
    };

    /**
     * <p>
     *    Update does the work of mapping the texture onto the triangles for the bar                            <br/>
     *    It now doesn't occur the cost of free/alloc data every update cycle.                                  <br/>
     *    It also only changes the percentage point but no other points if they have not been modified.         <br/>
     *                                                                                                          <br/>
     *    It now deals with flipped texture. If you run into this problem, just use the                         <br/>
     *    sprite property and enable the methods flipX, flipY.                                                  <br/>
     * </p>
     * @private
     */
    proto._updateBar = function(){
        var node = this._node;
        if (!node._sprite)
            return;

        var i, alpha = node._percentage / 100.0;
        var locBarChangeRate = node._barChangeRate;
        var alphaOffset = cc.pMult(cc.p((1.0 - locBarChangeRate.x) + alpha * locBarChangeRate.x,
                (1.0 - locBarChangeRate.y) + alpha * locBarChangeRate.y), 0.5);
        var min = cc.pSub(node._midPoint, alphaOffset), max = cc.pAdd(node._midPoint, alphaOffset);

        if (min.x < 0) {
            max.x += -min.x;
            min.x = 0;
        }

        if (max.x > 1) {
            min.x -= max.x - 1;
            max.x = 1;
        }

        if (min.y < 0) {
            max.y += -min.y;
            min.y = 0;
        }

        if (max.y > 1) {
            min.y -= max.y - 1;
            max.y = 1;
        }

        var locVertexData;
        if (!this._reverseDirection) {
            if (!this._vertexData) {
                this._vertexDataCount = 4;
                var vertexDataLen = cc.V2F_C4B_T2F.BYTES_PER_ELEMENT, locCount = 4;
                this._vertexArrayBuffer = new ArrayBuffer(locCount * vertexDataLen);
                this._vertexData = [];
                for (i = 0; i < locCount; i++)
                    this._vertexData[i] = new cc.V2F_C4B_T2F(null, null, null, this._vertexArrayBuffer, i * vertexDataLen);
            }

            locVertexData = this._vertexData;
            //    TOPLEFT
            locVertexData[0].texCoords = this._textureCoordFromAlphaPoint(cc.p(min.x, max.y));
            locVertexData[0].vertices = this._vertexFromAlphaPoint(cc.p(min.x, max.y));

            //    BOTLEFT
            locVertexData[1].texCoords = this._textureCoordFromAlphaPoint(cc.p(min.x, min.y));
            locVertexData[1].vertices = this._vertexFromAlphaPoint(cc.p(min.x, min.y));

            //    TOPRIGHT
            locVertexData[2].texCoords = this._textureCoordFromAlphaPoint(cc.p(max.x, max.y));
            locVertexData[2].vertices = this._vertexFromAlphaPoint(cc.p(max.x, max.y));

            //    BOTRIGHT
            locVertexData[3].texCoords = this._textureCoordFromAlphaPoint(cc.p(max.x, min.y));
            locVertexData[3].vertices = this._vertexFromAlphaPoint(cc.p(max.x, min.y));
        } else {
            if (!this._vertexData) {
                this._vertexDataCount = 8;
                var rVertexDataLen = cc.V2F_C4B_T2F.BYTES_PER_ELEMENT, rLocCount = 8;
                this._vertexArrayBuffer = new ArrayBuffer(rLocCount * rVertexDataLen);
                var rTempData = [];
                for (i = 0; i < rLocCount; i++)
                    rTempData[i] = new cc.V2F_C4B_T2F(null, null, null, this._vertexArrayBuffer, i * rVertexDataLen);
                //    TOPLEFT 1
                rTempData[0].texCoords = this._textureCoordFromAlphaPoint(cc.p(0, 1));
                rTempData[0].vertices = this._vertexFromAlphaPoint(cc.p(0, 1));

                //    BOTLEFT 1
                rTempData[1].texCoords = this._textureCoordFromAlphaPoint(cc.p(0, 0));
                rTempData[1].vertices = this._vertexFromAlphaPoint(cc.p(0, 0));

                //    TOPRIGHT 2
                rTempData[6].texCoords = this._textureCoordFromAlphaPoint(cc.p(1, 1));
                rTempData[6].vertices = this._vertexFromAlphaPoint(cc.p(1, 1));

                //    BOTRIGHT 2
                rTempData[7].texCoords = this._textureCoordFromAlphaPoint(cc.p(1, 0));
                rTempData[7].vertices = this._vertexFromAlphaPoint(cc.p(1, 0));

                this._vertexData = rTempData;
            }

            locVertexData = this._vertexData;
            //    TOPRIGHT 1
            locVertexData[2].texCoords = this._textureCoordFromAlphaPoint(cc.p(min.x, max.y));
            locVertexData[2].vertices = this._vertexFromAlphaPoint(cc.p(min.x, max.y));

            //    BOTRIGHT 1
            locVertexData[3].texCoords = this._textureCoordFromAlphaPoint(cc.p(min.x, min.y));
            locVertexData[3].vertices = this._vertexFromAlphaPoint(cc.p(min.x, min.y));

            //    TOPLEFT 2
            locVertexData[4].texCoords = this._textureCoordFromAlphaPoint(cc.p(max.x, max.y));
            locVertexData[4].vertices = this._vertexFromAlphaPoint(cc.p(max.x, max.y));

            //    BOTLEFT 2
            locVertexData[5].texCoords = this._textureCoordFromAlphaPoint(cc.p(max.x, min.y));
            locVertexData[5].vertices = this._vertexFromAlphaPoint(cc.p(max.x, min.y));
        }
        this._updateColor();
    };

    /**
     * <p>
     *    Update does the work of mapping the texture onto the triangles            <br/>
     *    It now doesn't occur the cost of free/alloc data every update cycle.      <br/>
     *    It also only changes the percentage point but no other points if they have not been modified.       <br/>
     *                                                                              <br/>
     *    It now deals with flipped texture. If you run into this problem, just use the                       <br/>
     *    sprite property and enable the methods flipX, flipY.                      <br/>
     * </p>
     * @private
     */
    proto._updateRadial = function () {
        var node = this._node;
        if (!node._sprite)
            return;

        var i, locMidPoint = node._midPoint;
        var alpha = node._percentage / 100;
        var angle = 2 * (cc.PI) * ( node._reverseDirection ? alpha : 1.0 - alpha);

        //    We find the vector to do a hit detection based on the percentage
        //    We know the first vector is the one @ 12 o'clock (top,mid) so we rotate
        //    from that by the progress angle around the m_tMidpoint pivot
        var topMid = cc.p(locMidPoint.x, 1);
        var percentagePt = cc.pRotateByAngle(topMid, locMidPoint, angle);

        var index = 0;
        var hit;

        if (alpha == 0) {
            //    More efficient since we don't always need to check intersection
            //    If the alpha is zero then the hit point is top mid and the index is 0.
            hit = topMid;
            index = 0;
        } else if (alpha == 1) {
            //    More efficient since we don't always need to check intersection
            //    If the alpha is one then the hit point is top mid and the index is 4.
            hit = topMid;
            index = 4;
        } else {
            //    We run a for loop checking the edges of the texture to find the
            //    intersection point
            //    We loop through five points since the top is split in half

            var min_t = cc.FLT_MAX;
            var locProTextCoordsCount = cc.ProgressTimer.TEXTURE_COORDS_COUNT;
            for (i = 0; i <= locProTextCoordsCount; ++i) {
                var pIndex = (i + (locProTextCoordsCount - 1)) % locProTextCoordsCount;

                var edgePtA = this._boundaryTexCoord(i % locProTextCoordsCount);
                var edgePtB = this._boundaryTexCoord(pIndex);

                //    Remember that the top edge is split in half for the 12 o'clock position
                //    Let's deal with that here by finding the correct endpoints
                if (i == 0)
                    edgePtB = cc.pLerp(edgePtA, edgePtB, 1 - locMidPoint.x);
                else if (i == 4)
                    edgePtA = cc.pLerp(edgePtA, edgePtB, 1 - locMidPoint.x);

                // retPoint are returned by ccpLineIntersect
                var retPoint = cc.p(0, 0);
                if (cc.pLineIntersect(edgePtA, edgePtB, locMidPoint, percentagePt, retPoint)) {
                    //    Since our hit test is on rays we have to deal with the top edge
                    //    being in split in half so we have to test as a segment
                    if ((i == 0 || i == 4)) {
                        //    s represents the point between edgePtA--edgePtB
                        if (!(0 <= retPoint.x && retPoint.x <= 1))
                            continue;
                    }
                    //    As long as our t isn't negative we are at least finding a
                    //    correct hitpoint from m_tMidpoint to percentagePt.
                    if (retPoint.y >= 0) {
                        //    Because the percentage line and all the texture edges are
                        //    rays we should only account for the shortest intersection
                        if (retPoint.y < min_t) {
                            min_t = retPoint.y;
                            index = i;
                        }
                    }
                }
            }

            //    Now that we have the minimum magnitude we can use that to find our intersection
            hit = cc.pAdd(locMidPoint, cc.pMult(cc.pSub(percentagePt, locMidPoint), min_t));
        }

        //    The size of the vertex data is the index from the hitpoint
        //    the 3 is for the m_tMidpoint, 12 o'clock point and hitpoint position.
        var sameIndexCount = true;
        if (this._vertexDataCount != index + 3) {
            sameIndexCount = false;
            this._vertexData = null;
            this._vertexArrayBuffer = null;
            this._vertexDataCount = 0;
        }

        if (!this._vertexData) {
            this._vertexDataCount = index + 3;
            var locCount = this._vertexDataCount, vertexDataLen = cc.V2F_C4B_T2F.BYTES_PER_ELEMENT;
            this._vertexArrayBuffer = new ArrayBuffer(locCount * vertexDataLen);
            var locData = [];
            for (i = 0; i < locCount; i++)
                locData[i] = new cc.V2F_C4B_T2F(null, null, null, this._vertexArrayBuffer, i * vertexDataLen);

            this._vertexData = locData;
            if(!this._vertexData){
                cc.log( "cc.ProgressTimer._updateRadial() : Not enough memory");
                return;
            }
        }
        this._updateColor();

        var locVertexData = this._vertexData;
        if (!sameIndexCount) {
            //    First we populate the array with the m_tMidpoint, then all
            //    vertices/texcoords/colors of the 12 'o clock start and edges and the hitpoint
            locVertexData[0].texCoords = this._textureCoordFromAlphaPoint(locMidPoint);
            locVertexData[0].vertices = this._vertexFromAlphaPoint(locMidPoint);

            locVertexData[1].texCoords = this._textureCoordFromAlphaPoint(topMid);
            locVertexData[1].vertices = this._vertexFromAlphaPoint(topMid);

            for (i = 0; i < index; i++) {
                var alphaPoint = this._boundaryTexCoord(i);
                locVertexData[i + 2].texCoords = this._textureCoordFromAlphaPoint(alphaPoint);
                locVertexData[i + 2].vertices = this._vertexFromAlphaPoint(alphaPoint);
            }
        }

        //    hitpoint will go last
        locVertexData[this._renderCmd._vertexDataCount - 1].texCoords = this._textureCoordFromAlphaPoint(hit);
        locVertexData[this._renderCmd._vertexDataCount - 1].vertices = this._vertexFromAlphaPoint(hit);
    };

    proto._boundaryTexCoord = function (index) {
        if (index < cc.ProgressTimer.TEXTURE_COORDS_COUNT) {
            var locProTextCoords = cc.ProgressTimer.TEXTURE_COORDS;
            if (this._node._reverseDirection)
                return cc.p((locProTextCoords >> (7 - (index << 1))) & 1, (locProTextCoords >> (7 - ((index << 1) + 1))) & 1);
            else
                return cc.p((locProTextCoords >> ((index << 1) + 1)) & 1, (locProTextCoords >> (index << 1)) & 1);
        }
        return cc.p(0,0);
    };

    proto._textureCoordFromAlphaPoint = function (alpha) {
        var locSprite = this._node._sprite;
        if (!locSprite) {
            return {u:0, v:0}; //new cc.Tex2F(0, 0);
        }
        var quad = locSprite.quad;
        var min = cc.p(quad.bl.texCoords.u, quad.bl.texCoords.v);
        var max = cc.p(quad.tr.texCoords.u, quad.tr.texCoords.v);

        //  Fix bug #1303 so that progress timer handles sprite frame texture rotation
        if (locSprite.textureRectRotated) {
            var temp = alpha.x;
            alpha.x = alpha.y;
            alpha.y = temp;
        }
        return {u: min.x * (1 - alpha.x) + max.x * alpha.x, v: min.y * (1 - alpha.y) + max.y * alpha.y};
    };

    proto._vertexFromAlphaPoint = function (alpha) {
        var locSprite = this._node._sprite;
        if (!locSprite) {
            return {x: 0, y: 0};
        }
        var quad = locSprite.quad;
        var min = cc.p(quad.bl.vertices.x, quad.bl.vertices.y);
        var max = cc.p(quad.tr.vertices.x, quad.tr.vertices.y);
        return {x: min.x * (1 - alpha.x) + max.x * alpha.x, y: min.y * (1 - alpha.y) + max.y * alpha.y};
    };

    proto._updateColor = function(){
        var node = this._node;
        if (!node._sprite || !this._vertexData)
            return;

        var sc = node._sprite.quad.tl.colors;
        var locVertexData = this._vertexData;
        for (var i = 0, len = this._vertexDataCount; i < len; ++i)
            locVertexData[i].colors = sc;
        this._vertexDataDirty = true;
    };
})();