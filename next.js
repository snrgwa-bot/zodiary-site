// Zodiary site: draws the real sky for today or for a birthday, and lists the next Moon phases.
// Everything is calculated in the browser with Astronomy Engine (MIT). Nothing typed here is sent anywhere.
(function () {
  "use strict";
  var A = window.Astronomy;
  var svg = document.getElementById("wheel");
  if (!A || !svg) return;

  var NS = "http://www.w3.org/2000/svg";
  var SIGNS = [
    ["Aries", "♈", "fire"], ["Taurus", "♉", "earth"], ["Gemini", "♊", "air"], ["Cancer", "♋", "water"],
    ["Leo", "♌", "fire"], ["Virgo", "♍", "earth"], ["Libra", "♎", "air"], ["Scorpio", "♏", "water"],
    ["Sagittarius", "♐", "fire"], ["Capricorn", "♑", "earth"], ["Aquarius", "♒", "air"], ["Pisces", "♓", "water"]
  ];
  var BODIES = [
    ["Sun", "☉"], ["Moon", "☽"], ["Mercury", "☿"], ["Venus", "♀"], ["Mars", "♂"], ["Jupiter", "♃"], ["Saturn", "♄"]
  ];
  var TEXT = "︎"; // keeps the glyphs as text, not emoji
  var css = getComputedStyle(document.documentElement);
  function colour(name) { return css.getPropertyValue("--" + name).trim(); }

  function el(name, attrs, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  // 0° Aries sits at nine o'clock and the signs run counter-clockwise, as on a birth chart.
  function point(lon, r) {
    var a = (180 + lon) * Math.PI / 180;
    return [200 + r * Math.cos(a), 200 - r * Math.sin(a)];
  }
  function arc(from, to, r1, r2) {
    var a = point(from, r1), b = point(to, r1), c = point(to, r2), d = point(from, r2);
    return "M" + a + " A" + r1 + " " + r1 + " 0 0 0 " + b + " L" + c + " A" + r2 + " " + r2 + " 0 0 1 " + d + " Z";
  }

  // The fixed parts: the ring of signs.
  SIGNS.forEach(function (s, i) {
    svg.appendChild(el("path", { "class": "seg", d: arc(i * 30, i * 30 + 30, 196, 160), fill: colour(s[2]) }));
    var p = point(i * 30 + 15, 178);
    svg.appendChild(el("text", { "class": "sign", x: p[0], y: p[1] }, s[1] + TEXT));
    var q1 = point(i * 30, 160), q2 = point(i * 30, 44);
    svg.appendChild(el("line", { "class": "spoke", x1: q1[0], y1: q1[1], x2: q2[0], y2: q2[1] }));
  });
  svg.appendChild(el("circle", { "class": "ring", cx: 200, cy: 200, r: 160 }));
  svg.appendChild(el("circle", { "class": "hub", cx: 200, cy: 200, r: 44 }));

  // The moving parts: one group per body, turned to its place in the sky.
  var marks = BODIES.map(function (b) {
    var g = el("g", { "class": "body" });
    var dot = el("circle", { "class": "body-dot", cx: 0, cy: 200, r: 7 });
    var glyph = el("text", { "class": "body-glyph", x: 0, y: 200 }, b[1] + TEXT);
    g.appendChild(dot); g.appendChild(glyph); svg.appendChild(g);
    return { g: g, dot: dot, glyph: glyph, turn: 0 };
  });

  function longitudes(date) {
    return BODIES.map(function (b) {
      if (b[0] === "Sun") return A.SunPosition(date).elon;
      if (b[0] === "Moon") return A.EclipticGeoMoon(date).lon;
      return A.Ecliptic(A.GeoVector(b[0], date, true)).elon;
    });
  }

  var list = document.getElementById("placements");
  var when = document.getElementById("sky-when");
  var title = document.getElementById("wheel-title");

  function show(date, label) {
    var lons = longitudes(date);
    // Bodies that sit close together step inward so their glyphs do not collide.
    var order = lons.map(function (l, i) { return [l, i]; }).sort(function (a, b) { return a[0] - b[0]; });
    var lane = [];
    order.forEach(function (o, k) {
      var prev = order[(k + order.length - 1) % order.length];
      var gap = Math.abs(((o[0] - prev[0] + 540) % 360) - 180);
      lane[o[1]] = k > 0 && gap < 11 ? (lane[prev[1]] + 1) % 3 : 0;
    });
    list.textContent = "";
    lons.forEach(function (lon, i) {
      var m = marks[i], sign = SIGNS[Math.floor(lon / 30) % 12], r = 136 - lane[i] * 30;
      // Turn the shortest way round from where the body is now.
      var target = -lon, delta = ((target - m.turn + 540) % 360) - 180;
      m.turn += delta;
      // The glyph sits in its lane; the small dot on the ring marks the exact degree.
      m.glyph.setAttribute("x", 200 - r);
      m.dot.setAttribute("cx", 200 - 153); m.dot.setAttribute("cy", 200); m.dot.setAttribute("r", 4.5);
      m.dot.setAttribute("fill", colour(sign[2]));
      m.g.style.transform = "rotate(" + m.turn + "deg)";
      m.glyph.style.transform = "rotate(" + (-m.turn) + "deg)";

      var li = document.createElement("li");
      var sw = document.createElement("span"); sw.className = "swatch"; sw.style.background = colour(sign[2]);
      var who = document.createElement("span"); who.className = "who"; who.textContent = BODIES[i][0];
      var where = document.createElement("span"); where.className = "where";
      where.textContent = sign[0] + " " + Math.floor(lon % 30) + "°";
      li.appendChild(sw); li.appendChild(who); li.appendChild(where); list.appendChild(li);
    });
    when.textContent = label; title.textContent = label;
  }

  var longDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  show(new Date(), "The sky right now");

  var form = document.getElementById("born"), input = document.getElementById("date"), note = document.getElementById("born-note");
  var noteDefault = note.textContent;
  input.max = new Date().toISOString().slice(0, 10);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var parts = (input.value || "").split("-").map(Number);
    var date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
    if (parts.length !== 3 || isNaN(date) || parts[0] < 1900 || date > new Date()) {
      note.textContent = "Choose a date between 1900 and today.";
      note.classList.add("is-error"); input.focus();
      return;
    }
    note.textContent = noteDefault; note.classList.remove("is-error");
    show(date, "The sky on " + longDate.format(date));
    if (window.matchMedia("(max-width: 900px)").matches) {
      svg.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
  });

  // The next four Moon phases, with the sign the Moon will be in.
  var row = document.getElementById("moon-row");
  var PHASES = ["New Moon", "First quarter", "Full Moon", "Last quarter"];
  var dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });
  function moonIcon(q) {
    var s = el("svg", { viewBox: "0 0 52 52", "aria-hidden": "true" });
    s.appendChild(el("circle", { cx: 26, cy: 26, r: 24, fill: "rgba(255,246,229,.14)", stroke: "rgba(255,246,229,.5)", "stroke-width": 1.5 }));
    if (q === 2) s.appendChild(el("circle", { cx: 26, cy: 26, r: 24, fill: colour("moon") }));
    if (q === 1) s.appendChild(el("path", { d: "M26 2 A24 24 0 0 1 26 50 Z", fill: colour("moon") }));
    if (q === 3) s.appendChild(el("path", { d: "M26 2 A24 24 0 0 0 26 50 Z", fill: colour("moon") }));
    return s;
  }
  var q = A.SearchMoonQuarter(new Date());
  for (var i = 0; i < 4; i++) {
    var d = q.time.date, sign = SIGNS[Math.floor(A.EclipticGeoMoon(d).lon / 30) % 12];
    var li = document.createElement("li");
    li.appendChild(moonIcon(q.quarter));
    [["phase", PHASES[q.quarter]], ["when", dayFormat.format(d)], ["sign-line", "Moon in " + sign[0]]].forEach(function (t) {
      var p = document.createElement("span"); p.className = t[0]; p.textContent = t[1]; li.appendChild(p);
    });
    row.appendChild(li);
    q = A.NextMoonQuarter(q);
  }
})();
