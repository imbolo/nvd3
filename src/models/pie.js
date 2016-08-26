nv.models.pie = function() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 500
        , height = 500
        , getX = function(d) { return d.x }
        , getY = function(d) { return d.y }
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , container = null
        , color = nv.utils.defaultColor()
        , valueFormat = d3.format(',.2f')
        , showLabels = true
        , showLabelWithLine = false
        , labelsOutside = false
        , labelType = "key"
        , labelThreshold = .02 //if slice percentage is under this, don't show label
        , donut = false
        , title = false
        , growOnHover = true
        , titleOffset = 0
        , labelSunbeamLayout = false
        , startAngle = false
        , padAngle = false
        , endAngle = false
        , cornerRadius = 0
        , donutRatio = 0.5
        , arcsRadius = []
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        ;

    var arcs = [];
    var arcsOver = [];
    var labelPieDistance = 25;

    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function(data) {
            if (showLabelWithLine) {
                var maxLabelCount = Math.floor(8 + 3 * (height - 150) / 100);
                maxLabelCount = d3.min([maxLabelCount, data[0].length]);                
                var totalValue = 0; 
                var copiedData = data[0].map(function(item) {
                    totalValue += getY(item);
                    return item;
                });
                var minItem = copiedData.sort(function(a, b) {
                    return getY(b) - getY(a);
                }).slice(0, maxLabelCount)[maxLabelCount - 1]
                
                labelThreshold = getY(minItem) / totalValue - 0.0001;
                labelPieDistance = 25 + ((height - 350) / 350) * 10;
            }
            var availableWidth = width - margin.left - margin.right
                , availableHeight = height - margin.top - margin.bottom
                , radius = Math.min(availableWidth, availableHeight) / 2
                , arcsRadiusOuter = []
                , arcsRadiusInner = []
                ;

            container = d3.select(this)
            if (arcsRadius.length === 0) {
                var outer = radius - radius / 5;
                var inner = donutRatio * radius;
                for (var i = 0; i < data[0].length; i++) {
                    arcsRadiusOuter.push(outer);
                    arcsRadiusInner.push(inner);
                }
            } else {
                if(growOnHover){
                    arcsRadiusOuter = arcsRadius.map(function (d) { return (d.outer - d.outer / 5) * radius; });
                    arcsRadiusInner = arcsRadius.map(function (d) { return (d.inner - d.inner / 5) * radius; });
                    donutRatio = d3.min(arcsRadius.map(function (d) { return (d.inner - d.inner / 5); }));
                } else {
                    arcsRadiusOuter = arcsRadius.map(function (d) { return d.outer * radius; });
                    arcsRadiusInner = arcsRadius.map(function (d) { return d.inner * radius; });
                    donutRatio = d3.min(arcsRadius.map(function (d) { return d.inner; }));
                }
            }
            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-pie').data(data);
            var wrapEnter = wrap.enter().append('g').attr('class','nvd3 nv-wrap nv-pie nv-chart-' + id);
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');
            var g_pie = gEnter.append('g').attr('class', 'nv-pie');
            gEnter.append('g').attr('class', 'nv-pieLabels');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            g.select('.nv-pie').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');
            g.select('.nv-pieLabels').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            //
            container.on('click', function(d,i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });

            arcs = [];
            arcsOver = [];
            for (var i = 0; i < data[0].length; i++) {

                var arc = d3.svg.arc().outerRadius(arcsRadiusOuter[i]);
                var arcOver = d3.svg.arc().outerRadius(arcsRadiusOuter[i] + 5);

                if (startAngle !== false) {
                    arc.startAngle(startAngle);
                    arcOver.startAngle(startAngle);
                }
                if (endAngle !== false) {
                    arc.endAngle(endAngle);
                    arcOver.endAngle(endAngle);
                }
                if (donut) {
                    arc.innerRadius(arcsRadiusInner[i]);
                    arcOver.innerRadius(arcsRadiusInner[i]);
                }

                if (arc.cornerRadius && cornerRadius) {
                    arc.cornerRadius(cornerRadius);
                    arcOver.cornerRadius(cornerRadius);
                }

                arcs.push(arc);
                arcsOver.push(arcOver);
            }

            // Setup the Pie chart and choose the data element
            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d) { return d.disabled ? 0 : getY(d) });

            // padAngle added in d3 3.5
            if (pie.padAngle && padAngle) {
                pie.padAngle(padAngle);
            }

            // if title is specified and donut, put it in the middle
            if (donut && title) {
                g_pie.append("text").attr('class', 'nv-pie-title');

                wrap.select('.nv-pie-title')
                    .style("text-anchor", "middle")
                    .text(function (d) {
                        return title;
                    })
                    .style("font-size", (Math.min(availableWidth, availableHeight)) * donutRatio * 2 / (title.length + 2) + "px")
                    .attr("dy", "0.35em") // trick to vertically center text
                    .attr('transform', function(d, i) {
                        return 'translate(0, '+ titleOffset + ')';
                    });
            }

            var slices = wrap.select('.nv-pie').selectAll('.nv-slice').data(pie);
            var pieLabels = wrap.select('.nv-pieLabels').selectAll('.nv-label').data(pie);
            var labels = wrap.select('.nv-pieLabels').selectAll('.label').data(pie)
            var labelPolyline = wrap.select('.nv-pieLabels').selectAll('.label-polyline').data(pie)

            slices.exit().remove();
            pieLabels.exit().remove();
            labels.exit().remove()
            labelPolyline.exit().remove();

            var ae = slices.enter().append('g');
            ae.attr('class', 'nv-slice');
            ae.on('mouseover', function(d, i) {
                d3.select(this).classed('hover', true);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(70)
                        .attr("d", arcsOver[i]);
                }
                dispatch.elementMouseover({
                    data: d.data,
                    index: i,
                    color: d3.select(this).style("fill"),
                    percent: (d.endAngle - d.startAngle) / (2 * Math.PI)
                });
            });
            ae.on('mouseout', function(d, i) {
                d3.select(this).classed('hover', false);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(50)
                        .attr("d", arcs[i]);
                }
                dispatch.elementMouseout({data: d.data, index: i});
            });
            ae.on('mousemove', function(d, i) {
                dispatch.elementMousemove({data: d.data, index: i});
            });
            ae.on('click', function(d, i) {
                var element = this;
                dispatch.elementClick({
                    data: d.data,
                    index: i,
                    color: d3.select(this).style("fill"),
                    event: d3.event,
                    element: element
                });
            });
            ae.on('dblclick', function(d, i) {
                dispatch.elementDblClick({
                    data: d.data,
                    index: i,
                    color: d3.select(this).style("fill")
                });
            });

            slices.attr('fill', function(d,i) { return color(d.data, i); });
            slices.attr('stroke', function(d,i) { return color(d.data, i); });

            var paths = ae.append('path').each(function(d) {
                this._current = d;
            });

            slices.select('path')
                .transition()
                .attr('d', function (d, i) { return arcs[i](d); })
                .attrTween('d', arcTween);

            if (showLabelWithLine) {
                var labelsData = [];
                var isLabelHidden = function (i) {
                    if (!labelsData[i]) {
                        return false;
                    }
                    var d = labelsData[i].d;
                    var percent = getSlicePercentage(d);
                    if (!d.value || percent < labelThreshold) {
                        return true;
                    }
                    return false
                }

                var rectIntersect = function (r1, r2) {

                    var returnVal = (
                        // r2.left > r1.right
                        (r2.x > (r1.x + r1.w)) ||

                        // r2.right < r1.left
                        ((r2.x + r2.w) < r1.x) ||

                        // r2.top < r1.bottom
                        ((r2.y + r2.h) < r1.y) ||

                        // r2.bottom > r1.top
                        (r2.y > (r1.y + r1.h))
                    );

                    return !returnVal;
                }
                var rotate = function (x, y, xm, ym, a) {
                    // a = a * Math.PI / 180; // convert to radians

                    var cos = Math.cos,
                        sin = Math.sin,
                    // subtract midpoints, so that midpoint is translated to origin and add it in the end again
                    xr = (x - xm) * cos(a) - (y - ym) * sin(a) + xm,
                    yr = (x - xm) * sin(a) + (y - ym) * cos(a) + ym;

                    return { x: xr, y: yr };
                }
                var getLabelLineData = function () {
                    var lineData = []
                    labelsData.forEach(function(data, i) {
                        var percent = getSlicePercentage(data.d);
                        // if (true) {
                        if (data.d.value && percent > labelThreshold) {
                            var angle = midAngle(data.d);
                            var pieCenter = {
                                x: 0,//availableWidth / 2,
                                y: 0,//availableHeight / 2,
                                radius: radius * 0.8
                            };
                            var originCoords = rotate(pieCenter.x, pieCenter.y - pieCenter.radius, pieCenter.x, pieCenter.y, angle);
                            var heightOffset = data.h / 10; // TODO check
                            var labelXMargin = 2; // the x-distance of the label from the end of the line [TODO configurable]

                            var quarter = Math.floor(angle / (Math.PI / 2));
                            var midPoint = 4;
                            var x2, y2, x3, y3;

                            // this resolves an issue when the
                            if (quarter === 2 && angle === Math.PI) {
                                quarter = 1;
                            }

                            switch (quarter) {
                                case 0:
                                    x2 = data.x - labelXMargin - ((data.x - labelXMargin - originCoords.x) / 2);
                                    y2 = data.y + ((originCoords.y - data.y) / midPoint);
                                    x3 = data.x - labelXMargin;
                                    y3 = data.y - heightOffset;
                                    break;
                                case 1:
                                    x2 = originCoords.x + (data.x - originCoords.x) / midPoint;
                                    y2 = originCoords.y + (data.y - originCoords.y) / midPoint;
                                    x3 = data.x - labelXMargin;
                                    y3 = data.y - heightOffset;
                                    break;
                                case 2:
                                    var startOfLabelX = data.x + data.w + labelXMargin;
                                    x2 = originCoords.x - (originCoords.x - startOfLabelX) / midPoint;
                                    y2 = originCoords.y + (data.y - originCoords.y) / midPoint;
                                    x3 = data.x + data.w + labelXMargin;
                                    y3 = data.y - heightOffset;
                                    break;
                                case 3:
                                    var startOfLabel = data.x + data.w + labelXMargin;
                                    x2 = startOfLabel + ((originCoords.x - startOfLabel) / midPoint);
                                    y2 = data.y + (originCoords.y - data.y) / midPoint;
                                    x3 = data.x + data.w + labelXMargin;
                                    y3 = data.y - heightOffset;
                                    break;
                            }
                            var item = [
                                {x: originCoords.x, y: originCoords.y},
                                {x: x2, y: y2},
                                {x: x3, y: y3}
                            ];
                            item.color = color(data.d, i);
                            lineData.push(item)
                        } else {
                            var item = [
                                {x: 0, y: 0},
                                {x: 0, y: 0},
                                {x: 0, y: 0}
                            ];
                            item.color = color(data.d, i);
                            lineData.push(item)
                        }
                    })

                    return lineData;
                }
                var adjustLabelPos = function (nextIndex, lastCorrectlyPositionedLabel, info) {
                    var xDiff, yDiff, newXPos, newYPos;
                    newYPos = lastCorrectlyPositionedLabel.y + info.heightChange;
                    yDiff = info.center.y - newYPos;
                    if (Math.abs(info.lineLength) > Math.abs(yDiff)) {
                        xDiff = Math.sqrt((info.lineLength * info.lineLength) - (yDiff * yDiff));
                    } else {
                        xDiff = Math.sqrt((yDiff * yDiff) - (info.lineLength * info.lineLength));
                    }

                    if (lastCorrectlyPositionedLabel.hs === "right") {
                        newXPos = info.center.x + xDiff;
                    } else {
                        newXPos = info.center.x - xDiff - labelsData[nextIndex].w;
                    }

                    labelsData[nextIndex].x = newXPos;
                    labelsData[nextIndex].y = newYPos;
                }

                var labelHeight;

                var checkConflict = function (currIndex, direction, size) {
                    var i, curr;

                    if (size <= 1) {
                        return;
                    }

                    var currIndexHemisphere = labelsData[currIndex].hs;
                    if (direction === "clockwise" && currIndexHemisphere !== "right") {
                        return;
                    }
                    if (direction === "anticlockwise" && currIndexHemisphere !== "left") {
                        return;
                    }
                    var nextIndex = (direction === "clockwise") ? currIndex+1 : currIndex-1;

                    // this is the current label group being looked at. We KNOW it's positioned properly (the first item
                    // is always correct)
                    var currLabelGroup = labelsData[currIndex];

                    // this one we don't know about. That's the one we're going to look at and move if necessary
                    var examinedLabelGroup = labelsData[nextIndex];

                    var info = {
                        center: {x: 0, y: 0},
                        lineLength: (radius * 0.8 + labelPieDistance),
                        heightChange: labelsData[0].h || labelHeight + 1 // 1 = padding
                    };

                    // loop through *ALL* label groups examined so far to check for conflicts. This is because when they're
                    // very tightly fitted, a later label group may still appear high up on the page
                    if (direction === "clockwise") {
                        i = 0;
                        for (; i<=currIndex; i++) {
                            curr = labelsData[i];

                            // if there's a conflict with this label group, shift the label to be AFTER the last known
                            // one that's been properly placed
                            if (!isLabelHidden(nextIndex) && !isLabelHidden(i) && rectIntersect(curr, examinedLabelGroup)) {
                                adjustLabelPos(nextIndex, curr, info);
                                // break;
                            }
                        }
                    } else {
                        i = size - 1;
                        for (; i >= currIndex; i--) {
                            curr = labelsData[i];

                            // if there's a conflict with this label group, shift the label to be AFTER the last known
                            // one that's been properly placed
                            if (!isLabelHidden(nextIndex) && !isLabelHidden(i) && rectIntersect(curr, examinedLabelGroup)) {
                                adjustLabelPos(nextIndex, curr, info);
                                // break;
                            }
                        }
                    }
                    checkConflict(nextIndex, direction, size);
                }

                var getSlicePercentage = function(d) {
                    return (d.endAngle - d.startAngle) / (2 * Math.PI);
                };
                var midAngle = function(d){
                   return d.startAngle + (d.endAngle - d.startAngle)/2;
                }

                var arc = d3.svg.arc()
                  .outerRadius(radius * 0.8)
                  .innerRadius(radius * 0.8);

                var outerArc = d3.svg.arc()
                  .innerRadius(radius * 0.9)
                  .outerRadius(radius * 0.9);

                labels.enter().append('text').classed('label', true).attr("dy", ".35em")
                labels.transition().duration(300)
                    .text(function(d) {
                        var percent = getSlicePercentage(d);
                        if (!d.value || percent < labelThreshold) return '';
                        var label = ''
                        if(typeof labelType === 'function') {
                            label = labelType(d, i, {
                                'key': getX(d.data),
                                'value': getY(d.data),
                                'percent': valueFormat(percent)
                            });
                        } else {
                            switch (labelType) {
                                case 'key':
                                    label = getX(d.data);
                                    break;
                                case 'value':
                                    label = valueFormat(getY(d.data));
                                    break;
                                case 'percent':
                                    label = d3.format('%')(percent);
                                    break;
                            }
                        }
                        return label;
                    })

                labels.each(function(d, i) {
                    var labelNode = d3.select(this).node();
                    var angle = midAngle(d);
                    var pieCenter = {
                        x: 0,//availableWidth / 2,
                        y: 0//availableHeight / 2
                    }
                    var originalX = 0
                    var originalY = 0 - (radius * 0.8 + labelPieDistance);
                    var newCoords = rotate(originalX, originalY, pieCenter.x, pieCenter.y, angle);

                    labelsData[i] = {
                        d: d,
                        x: newCoords.x,
                        y: newCoords.y,
                    }
                });
                labels.attr('transform', function(d, i) {
                    return 'translate(' + [labelsData[i].x, labelsData[i].y] + ')'
                })
                setTimeout(function() {
                    labels.each(function(d, i) {
                        var labelNode = d3.select(this).node();
                        var bbox = labelNode.getBBox();
                        var angle = midAngle(d);
                        var hemisphere = 'right';
                        if (angle > Math.PI) {
                            labelsData[i].x -= (bbox.width + 8);
                            hemisphere = 'left'
                        } else {
                            labelsData[i].x += 8
                        }
                        labelsData[i].hs = hemisphere;
                        labelsData[i].w = bbox.width;
                        labelsData[i].width = bbox.width;
                        labelsData[i].h = bbox.height;
                        labelsData[i].height = bbox.height;
                    });
                    labelHeight = d3.max(labelsData, function(d) {return d.h});

                    labels.attr('transform', function(d, i) {
                        return 'translate(' + [labelsData[i].x, labelsData[i].y] + ')'
                    })

                    var size = labelsData.length;
                    checkConflict(0, 'clockwise', size)
                    checkConflict(size - 1, 'anticlockwise', size)
                    setTimeout(function() {
                        labels.attr('transform', function(d, i) {
                            return 'translate(' + [labelsData[i].x, labelsData[i].y] + ')'
                        })
                        var lineData = getLabelLineData();

                        var lines = wrap.select('.nv-pieLabels').selectAll('.label-polyline').data(pie)

                        var lineFunction = d3.svg.line()
                            .interpolate("cardinal")
                            .x(function(d) { return d.x; })
                            .y(function(d) { return d.y; });
                        var index = 0;
                        var lineGroup = lines.enter().append("path").classed("label-polyline",true)
                        lines.transition().duration(0)
                            .attrTween('d', function(d, i) {
                                var percent = getSlicePercentage(d);
                                if (!d.value || percent < labelThreshold) {
                                    return function(t) {
                                        return []
                                    }
                                }
                                return function(t) {
                                    return lineFunction(lineData[i])
                                }
                            })
                            .attr('fill', 'none')
                            .attr('stroke-width', '1px')
                            .attr('style', function(d, i) {
                                return 'stroke:' + color(d.data, i)
                            })

                    }, 50)
                }, 50)

            }


            if (showLabels) {
                // This does the normal label
                var labelsArc = [];
                for (var i = 0; i < data[0].length; i++) {
                    labelsArc.push(arcs[i]);

                    if (labelsOutside) {
                        if (donut) {
                            labelsArc[i] = d3.svg.arc().outerRadius(arcs[i].outerRadius());
                            if (startAngle !== false) labelsArc[i].startAngle(startAngle);
                            if (endAngle !== false) labelsArc[i].endAngle(endAngle);
                        }
                    } else if (!donut) {
                            labelsArc[i].innerRadius(0);
                    }
                }

                pieLabels.enter().append("g").classed("nv-label",true).each(function(d,i) {
                    var group = d3.select(this);

                    group.attr('transform', function (d, i) {
                        if (labelSunbeamLayout) {
                            d.outerRadius = arcsRadiusOuter[i] + 10; // Set Outer Coordinate
                            d.innerRadius = arcsRadiusOuter[i] + 15; // Set Inner Coordinate
                            var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                            if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
                                rotateAngle -= 90;
                            } else {
                                rotateAngle += 90;
                            }
                            return 'translate(' + labelsArc[i].centroid(d) + ') rotate(' + rotateAngle + ')';
                        } else {
                            d.outerRadius = radius + 10; // Set Outer Coordinate
                            d.innerRadius = radius + 15; // Set Inner Coordinate
                            return 'translate(' + labelsArc[i].centroid(d) + ')'
                        }
                    });

                    group.append('rect')
                        .style('stroke', '#fff')
                        .style('fill', '#fff')
                        .attr("rx", 3)
                        .attr("ry", 3);

                    group.append('text')
                        .style('text-anchor', labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle') //center the text on it's origin or begin/end if orthogonal aligned
                        .style('fill', '#000')
                });

                var labelLocationHash = {};
                var avgHeight = 14;
                var avgWidth = 140;
                var createHashKey = function(coordinates) {
                    return Math.floor(coordinates[0]/avgWidth) * avgWidth + ',' + Math.floor(coordinates[1]/avgHeight) * avgHeight;
                };
                var getSlicePercentage = function(d) {
                    return (d.endAngle - d.startAngle) / (2 * Math.PI);
                };

                pieLabels.watchTransition(renderWatch, 'pie labels').attr('transform', function (d, i) {
                    if (labelSunbeamLayout) {
                        d.outerRadius = arcsRadiusOuter[i] + 10; // Set Outer Coordinate
                        d.innerRadius = arcsRadiusOuter[i] + 15; // Set Inner Coordinate
                        var rotateAngle = (d.startAngle + d.endAngle) / 2 * (180 / Math.PI);
                        if ((d.startAngle + d.endAngle) / 2 < Math.PI) {
                            rotateAngle -= 90;
                        } else {
                            rotateAngle += 90;
                        }
                        return 'translate(' + labelsArc[i].centroid(d) + ') rotate(' + rotateAngle + ')';
                    } else {
                        d.outerRadius = radius + 10; // Set Outer Coordinate
                        d.innerRadius = radius + 15; // Set Inner Coordinate

                        /*
                        Overlapping pie labels are not good. What this attempts to do is, prevent overlapping.
                        Each label location is hashed, and if a hash collision occurs, we assume an overlap.
                        Adjust the label's y-position to remove the overlap.
                        */
                        var center = labelsArc[i].centroid(d);
                        var percent = getSlicePercentage(d);
                        if (d.value && percent >= labelThreshold) {
                            var hashKey = createHashKey(center);
                            if (labelLocationHash[hashKey]) {
                                center[1] -= avgHeight;
                            }
                            labelLocationHash[createHashKey(center)] = true;
                        }
                        return 'translate(' + center + ')'
                    }
                });

                pieLabels.select(".nv-label text")
                    .style('text-anchor', function(d,i) {
                        //center the text on it's origin or begin/end if orthogonal aligned
                        return labelSunbeamLayout ? ((d.startAngle + d.endAngle) / 2 < Math.PI ? 'start' : 'end') : 'middle';
                    })
                    .text(function(d, i) {
                        var percent = getSlicePercentage(d);
                        var label = '';
                        if (!d.value || percent < labelThreshold) return '';

                        if(typeof labelType === 'function') {
                            label = labelType(d, i, {
                                'key': getX(d.data),
                                'value': getY(d.data),
                                'percent': valueFormat(percent)
                            });
                        } else {
                            switch (labelType) {
                                case 'key':
                                    label = getX(d.data);
                                    break;
                                case 'value':
                                    label = valueFormat(getY(d.data));
                                    break;
                                case 'percent':
                                    label = d3.format('%')(percent);
                                    break;
                            }
                        }
                        return label;
                    })
                ;
            }


            // Computes the angle of an arc, converting from radians to degrees.
            function angle(d) {
                var a = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
                return a > 90 ? a - 180 : a;
            }

            function arcTween(a, idx) {
                a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
                a.startAngle = isNaN(a.startAngle) ? 0 : a.startAngle;
                if (!donut) a.innerRadius = 0;
                var i = d3.interpolate(this._current, a);
                this._current = i(0);
                return function (t) {
                    return arcs[idx](i(t));
                };
            }
        });

        renderWatch.renderEnd('pie immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        arcsRadius: { get: function () { return arcsRadius; }, set: function (_) { arcsRadius = _; } },
        width:      {get: function(){return width;}, set: function(_){width=_;}},
        height:     {get: function(){return height;}, set: function(_){height=_;}},
        showLabels: {get: function(){return showLabels;}, set: function(_){showLabels=_;}},
        showLabelWithLine: {get: function(){return showLabelWithLine;}, set: function(_){showLabelWithLine=_;}},
        title:      {get: function(){return title;}, set: function(_){title=_;}},
        titleOffset:    {get: function(){return titleOffset;}, set: function(_){titleOffset=_;}},
        labelThreshold: {get: function(){return labelThreshold;}, set: function(_){labelThreshold=_;}},
        valueFormat:    {get: function(){return valueFormat;}, set: function(_){valueFormat=_;}},
        x:          {get: function(){return getX;}, set: function(_){getX=_;}},
        id:         {get: function(){return id;}, set: function(_){id=_;}},
        endAngle:   {get: function(){return endAngle;}, set: function(_){endAngle=_;}},
        startAngle: {get: function(){return startAngle;}, set: function(_){startAngle=_;}},
        padAngle:   {get: function(){return padAngle;}, set: function(_){padAngle=_;}},
        cornerRadius: {get: function(){return cornerRadius;}, set: function(_){cornerRadius=_;}},
        donutRatio:   {get: function(){return donutRatio;}, set: function(_){donutRatio=_;}},
        labelsOutside: {get: function(){return labelsOutside;}, set: function(_){labelsOutside=_;}},
        labelSunbeamLayout: {get: function(){return labelSunbeamLayout;}, set: function(_){labelSunbeamLayout=_;}},
        donut:              {get: function(){return donut;}, set: function(_){donut=_;}},
        growOnHover:        {get: function(){return growOnHover;}, set: function(_){growOnHover=_;}},

        // depreciated after 1.7.1
        pieLabelsOutside: {get: function(){return labelsOutside;}, set: function(_){
            labelsOutside=_;
            nv.deprecated('pieLabelsOutside', 'use labelsOutside instead');
        }},
        // depreciated after 1.7.1
        donutLabelsOutside: {get: function(){return labelsOutside;}, set: function(_){
            labelsOutside=_;
            nv.deprecated('donutLabelsOutside', 'use labelsOutside instead');
        }},
        // deprecated after 1.7.1
        labelFormat: {get: function(){ return valueFormat;}, set: function(_) {
            valueFormat=_;
            nv.deprecated('labelFormat','use valueFormat instead');
        }},

        // options that require extra logic in the setter
        margin: {get: function(){return margin;}, set: function(_){
            margin.top    = typeof _.top    != 'undefined' ? _.top    : margin.top;
            margin.right  = typeof _.right  != 'undefined' ? _.right  : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
            margin.left   = typeof _.left   != 'undefined' ? _.left   : margin.left;
        }},
        y: {get: function(){return getY;}, set: function(_){
            getY=d3.functor(_);
        }},
        color: {get: function(){return color;}, set: function(_){
            color=nv.utils.getColor(_);
        }},
        labelType:          {get: function(){return labelType;}, set: function(_){
            labelType= _ || 'key';
        }}
    });

    nv.utils.initOptions(chart);
    return chart;
};