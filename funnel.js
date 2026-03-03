(function () {

  var TOP_FRAC = 0.92;
  var BOT_FRAC = 0.38;

  function getProfile(n, availW) {
    return Array.from({ length: n }, function (_, i) {
      return {
        topW: availW * (TOP_FRAC - (TOP_FRAC - BOT_FRAC) * (i / n)),
        botW: availW * (TOP_FRAC - (TOP_FRAC - BOT_FRAC) * ((i + 1) / n))
      };
    });
  }

  function trapPath(cx, topW, topY, h, botW) {
    var tl = cx - topW / 2, tr = cx + topW / 2;
    var bl = cx - botW / 2, br = cx + botW / 2;
    var by = topY + h;
    return 'M' + tl + ',' + topY +
           ' L' + tr + ',' + topY +
           ' L' + br + ',' + by +
           ' L' + bl + ',' + by + ' Z';
  }

  function wordWrap(svgEl, text, maxWidth, fontSize, fontFamily) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var tmp = document.createElementNS(svgNS, 'text');
    tmp.setAttribute('font-size', fontSize + 'px');
    tmp.setAttribute('font-family', fontFamily);
    tmp.style.visibility = 'hidden';
    svgEl.appendChild(tmp);

    function measure(s) {
      tmp.textContent = s;
      try { return tmp.getBBox().width; } catch (e) { return s.length * fontSize * 0.58; }
    }

    var words = text.split(/\s+/);
    var lines = [], line = [];
    words.forEach(function (w) {
      var test = line.concat(w).join(' ');
      if (measure(test) > maxWidth && line.length > 0) {
        lines.push(line.join(' '));
        line = [w];
      } else {
        line.push(w);
      }
    });
    if (line.length) lines.push(line.join(' '));
    svgEl.removeChild(tmp);
    return lines;
  }

  var DEFAULT_COLORS = ['#F5C842', '#F0934A', '#C4748C', '#7A6FAB', '#5B9BD5'];

  function drawViz(data) {
    var container = document.getElementById('container') || document.body;
    container.innerHTML = '';

    var style = data.style || {};
    var fontColor  = (style.fontColor  && style.fontColor.value)  ? style.fontColor.value  : '#ffffff';
    var fontSize   = (style.fontSize   && style.fontSize.value)   ? parseInt(style.fontSize.value) : 15;
    var showValues = (style.showValues && style.showValues.value) ? style.showValues.value : false;
    var gap = 6;

    var segColors = DEFAULT_COLORS.map(function (def, i) {
      var key = 'color' + i;
      return (style[key] && style[key].value) ? style[key].value : def;
    });

    var rows = (data.tables && data.tables.DEFAULT) ? data.tables.DEFAULT : [];
    if (!rows.length) {
      container.innerHTML = '<p style="padding:16px;font-family:Arial,sans-serif;color:#666">Asigna una dimension y una metrica.</p>';
      return;
    }

    var stages = rows.slice(0, 5).map(function (row) {
      return {
        label: String(row.dimension && row.dimension[0] ? row.dimension[0] : ''),
        value: (row.metric && row.metric[0] !== undefined) ? row.metric[0] : null
      };
    });

    var n  = stages.length;
    var W  = container.offsetWidth  || 300;
    var H  = container.offsetHeight || 400;
    var cx = W / 2;
    var padX = 10, padTop = 10, padBot = 10;
    var availW = W - padX * 2;
    var segH   = (H - padTop - padBot - gap * (n - 1)) / n;
    var profile = getProfile(n, availW);
    var fontFamily = 'Arial, sans-serif';
    var lineH = fontSize * 1.35;
    var svgNS = 'http://www.w3.org/2000/svg';

    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width',  W);
    svg.setAttribute('height', H);
    svg.style.display = 'block';
    container.appendChild(svg);

    stages.forEach(function (stage, i) {
      var p    = profile[i];
      var topY = padTop + i * (segH + gap);
      var midW = (p.topW + p.botW) / 2;
      var midY = topY + segH / 2;

      var path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', trapPath(cx, p.topW, topY, segH, p.botW));
      path.setAttribute('fill', segColors[i]);
      svg.appendChild(path);

      var textMaxW = midW - 28;
      var lines = wordWrap(svg, stage.label, textMaxW, fontSize, fontFamily);
      var extraH = (showValues && stage.value !== null) ? lineH : 0;
      var totalTxtH = lines.length * lineH + extraH;
      var startY = midY - totalTxtH / 2 + lineH / 2;
      var minY = topY + 4 + lineH / 2;
      var maxY = topY + segH - 4 - (lines.length - 1) * lineH - lineH / 2;
      if (startY < minY) startY = minY;
      if (startY > maxY) startY = maxY;

      lines.forEach(function (ln, li) {
        var t = document.createElementNS(svgNS, 'text');
        t.setAttribute('x', cx);
        t.setAttribute('y', startY + li * lineH);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('dominant-baseline', 'middle');
        t.setAttribute('fill', fontColor);
        t.setAttribute('font-size', fontSize + 'px');
        t.setAttribute('font-family', fontFamily);
        t.setAttribute('font-weight', '600');
        t.textContent = ln;
        svg.appendChild(t);
      });

      if (showValues && stage.value !== null) {
        var vt = document.createElementNS(svgNS, 'text');
        vt.setAttribute('x', cx);
        vt.setAttribute('y', startY + lines.length * lineH);
        vt.setAttribute('text-anchor', 'middle');
        vt.setAttribute('dominant-baseline', 'middle');
        vt.setAttribute('fill', fontColor);
        vt.setAttribute('font-size', Math.max(9, fontSize - 3) + 'px');
        vt.setAttribute('font-family', fontFamily);
        vt.setAttribute('font-weight', '400');
        vt.setAttribute('opacity', '0.82');
        vt.textContent = (typeof stage.value === 'number') ? stage.value.toLocaleString() : stage.value;
        svg.appendChild(vt);
      }
    });
  }

  dscc.subscribeToData(drawViz, { transform: dscc.objectTransform });

}());
