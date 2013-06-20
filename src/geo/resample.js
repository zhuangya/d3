import "cartesian";
import "stream";

function d3_geo_resample(project) {
  var δ2 = .5, // precision, px²
      maxDepth = 16;

  function resample(stream) {
    var λ00, φ00, x00, y00, a00, b00, c00, // first point
        λ0, x0, y0, a0, b0, c0; // previous point

    var resample = {
      point: point,
      lineStart: lineStart,
      lineEnd: lineEnd,
      polygonStart: function() { stream.polygonStart(); resample.lineStart = ringStart; },
      polygonEnd: function() { stream.polygonEnd(); resample.lineStart = lineStart; }
    };

    function point(x, y) {
      x = project(x, y);
      stream.point(x[0], x[1]);
    }

    function lineStart() {
      x0 = NaN;
      resample.point = linePoint;
      stream.lineStart();
    }

    function linePoint(λ, φ) {
      var c = d3_geo_cartesian([λ, φ]), p = project(λ, φ);
      resampleLineTo(x0, y0, λ0, a0, b0, c0, x0 = p[0], y0 = p[1], λ0 = λ, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
      stream.point(x0, y0);
    }

    function lineEnd() {
      resample.point = point;
      stream.lineEnd();
    }

    function ringStart() {
      lineStart();
      resample.point = ringPoint;
      resample.lineEnd = ringEnd;
    }

    function ringPoint(λ, φ) {
      linePoint(λ00 = λ, φ00 = φ), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
      resample.point = linePoint;
    }

    function ringEnd() {
      resampleLineTo(x0, y0, λ0, a0, b0, c0, x00, y00, λ00, a00, b00, c00, maxDepth, stream);
      resample.lineEnd = lineEnd;
      lineEnd();
    }

    return resample;
  }

  function resampleLineTo(x0, y0, λ0, a0, b0, c0, x1, y1, λ1, a1, b1, c1, depth, stream) {
    var dx = x1 - x0,
        dy = y1 - y0,
        d2 = dx * dx + dy * dy;
    if (d2 > 4 * δ2 && depth--) {
      var a2 = 2 * a0 + a1,
          b2 = 2 * b0 + b1,
          c2 = 2 * c0 + c1,
          a3 = a0 + a1 * 2,
          b3 = b0 + b1 * 2,
          c3 = c0 + c1 * 2,
          m2 = Math.sqrt(a2 * a2 + b2 * b2 + c2 * c2),
          m3 = Math.sqrt(a3 * a3 + b3 * b3 + c3 * c3),
          φ2 = Math.asin(c2 /= m2),
          φ3 = Math.asin(c3 /= m3),
          λ2 = Math.abs(Math.abs(c2) - 1) < ε ? (λ0 * 2 + λ1) / 3 : Math.atan2(b2, a2),
          λ3 = Math.abs(Math.abs(c3) - 1) < ε ? (λ0 + λ1 * 2) / 3 : Math.atan2(b3, a3),
          p2 = project(λ2, φ2),
          p3 = project(λ3, φ3),
          x2 = p2[0],
          y2 = p2[1],
          x3 = p3[0],
          y3 = p3[1],
          dx2 = x2 - x0,
          dy2 = y2 - y0,
          dx3 = x3 - x0,
          dy3 = y3 - y0,
          dz2 = dy * dx2 - dx * dy2,
          dz3 = dy * dx3 - dx * dy3,
          r2 = dz2 * dz2 / d2 > δ2 || Math.abs((dx * dx2 + dy * dy2) / d2 - .5) > .3,
          r3 = dz3 * dz3 / d2 > δ2 || Math.abs((dx * dx3 + dy * dy3) / d2 - .5) > .3;
      a2 /= m2, b2 /= m2;
      a3 /= m3, b3 /= m3;
      if (r2 && r3) {
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x2, y2, λ2, a2, b2, c2, depth, stream);
        stream.point(x2, y2);
        resampleLineTo(x2, y2, λ2, a2, b2, c2, x3, y3, λ3, a3, b3, c3, depth, stream);
        stream.point(x3, y3);
        resampleLineTo(x3, y3, λ3, a3, b3, c3, x1, y1, λ1, a1, b1, c1, depth, stream);
      } else if (r2) {
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x2, y2, λ2, a2, b2, c2, depth, stream);
        stream.point(x2, y2);
        resampleLineTo(x2, y2, λ2, a2, b2, c2, x1, y1, λ1, a1, b1, c1, depth, stream);
      } else if (r3) {
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x3, y3, λ3, a3, b3, c3, depth, stream);
        stream.point(x3, y3);
        resampleLineTo(x3, y3, λ3, a3, b3, c3, x1, y1, λ1, a1, b1, c1, depth, stream);
      }
    }
  }

  resample.precision = function(_) {
    if (!arguments.length) return Math.sqrt(δ2);
    maxDepth = (δ2 = _ * _) > 0 && 16;
    return resample;
  };

  return resample;
}
