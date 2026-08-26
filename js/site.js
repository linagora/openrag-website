/* ==========================================================================
   OpenRAG website — behaviour
   Vanilla JS, no dependencies.
   ========================================================================== */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     Header: shadow once the page has scrolled
     --------------------------------------------------------------------- */

  var header = document.getElementById('header');

  function onScroll() {
    header.classList.toggle('is-stuck', window.scrollY > 8);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------------------
     Mobile navigation
     --------------------------------------------------------------------- */

  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');

  navToggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ---------------------------------------------------------------------
     Scroll reveal
     --------------------------------------------------------------------- */

  var revealables = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealables.forEach(function (el) {
      el.classList.add('is-in');
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    );

    revealables.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
     Active section in the nav
     --------------------------------------------------------------------- */

  var navLinks = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
  var watched = navLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute('href'));
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && watched.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (a) {
            a.classList.toggle(
              'is-active',
              a.getAttribute('href') === '#' + entry.target.id
            );
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    watched.forEach(function (s) {
      sectionObserver.observe(s);
    });
  }

  /* ---------------------------------------------------------------------
     RAG flow diagram: run the sequence when it scrolls into view
     --------------------------------------------------------------------- */

  var flow = document.getElementById('flowSvg');
  var flowSteps = document.querySelector('.flow-steps');
  /* The canvas is observed rather than the diagram itself: below 640px the
     diagram is hidden and the stepper takes its place, and a hidden element
     never intersects. */
  var flowCanvas = document.querySelector('.flow-canvas');

  function startFlow() {
    if (flow) {
      flow.classList.add('is-running');
    }
    if (flowSteps) {
      flowSteps.classList.add('is-running');
    }
  }

  /* The stepper shown on phones re-uses the diagram's own artwork. The nodes are
     cloned rather than referenced with <use>: document stylesheets do not reach
     inside a use element's shadow tree, so the line art would come out as flat
     black silhouettes. Cloning keeps one copy of the drawing in the markup and
     lets the existing .flow-svg rules style both. */
  if (flowSteps) {
    var placeholders = flowSteps.querySelectorAll('.flow-step-art[data-art]');
    var cloned = 0;

    Array.prototype.forEach.call(placeholders, function (holder) {
      var source = document.getElementById(holder.getAttribute('data-art'));

      if (!source) {
        return;
      }

      var copy = source.cloneNode(true);
      copy.removeAttribute('id');
      Array.prototype.forEach.call(copy.querySelectorAll('[id]'), function (el) {
        el.removeAttribute('id');
      });
      holder.appendChild(copy);
      cloned += 1;
    });

    if (cloned) {
      flowSteps.classList.add('has-art');
    }
  }

  if (flowCanvas) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      startFlow();
    } else {
      var flowObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              startFlow();
              flowObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.25 }
      );
      flowObserver.observe(flowCanvas);
    }
  }

  /* ---------------------------------------------------------------------
     Chat replay
     Reproduces the answer returned by the live demo on the
     openrag-OpenRAG partition, streamed the way Chainlit streams it.
     --------------------------------------------------------------------- */

  var QUESTION = 'What are OpenRAG key features?';

  var INTRO =
    'OpenRAG is a modern and extensible Retrieval-Augmented Generation (RAG) ' +
    'stack developed by LINAGORA. Here are its key features:';

  var FEATURES = [
    ['Open Source & Sovereign', ': AGPL-licensed, auditable, and community-driven.'],
    ['LLM-Agnostic', ': Connect your own model (e.g., Mistral, Claude, GPT) or use a hosted provider.'],
    ['Vector Search', ': With Milvus, segment your knowledge base per user or team.'],
    ['Multimodal Parsing', ': Supports audio transcription, image captioning, and PDF layout awareness.'],
    ['Scalable with Ray', ': Process, embed, and rerank at cluster scale using distributed tasks.'],
    ['Modern UIs', ': Web-based indexer, FastAPI Chainlit chat, and OpenAI-compatible API.']
  ];

  var OUTRO =
    'These features enable flexible and efficient deployment of AI assistants ' +
    'tailored to diverse content and user needs';

  var chatWindow = document.getElementById('chatWindow');
  var userBubble = document.getElementById('chatUser');
  var userText = document.getElementById('chatUserText');
  var trace = document.getElementById('chatTrace');
  var traceText = document.getElementById('chatTraceText');
  var answerEl = document.getElementById('chatAnswer');
  var sourcesEl = document.getElementById('chatSources');
  var replayBtn = document.getElementById('chatReplay');

  var runId = 0;
  var timers = [];

  function wait(ms) {
    return new Promise(function (resolve) {
      timers.push(setTimeout(resolve, ms));
    });
  }

  function clearTimers() {
    timers.forEach(clearTimeout);
    timers = [];
  }

  function resetChat() {
    clearTimers();
    runId += 1;
    userText.textContent = '';
    userBubble.classList.remove('is-on', 'is-done');
    trace.classList.remove('is-on', 'is-done');
    traceText.textContent = 'Searching for relevant documents…';
    answerEl.innerHTML = '';
    sourcesEl.classList.remove('is-on');
  }

  /* Types `text` into `node`, a few characters at a time. */
  function typeInto(node, text, speed, id) {
    return new Promise(function (resolve) {
      var i = 0;

      function tick() {
        if (id !== runId) return resolve();

        var step = Math.max(1, Math.round(Math.random() * 2) + 1);
        i = Math.min(text.length, i + step);
        node.textContent = text.slice(0, i);

        if (i >= text.length) return resolve();
        timers.push(setTimeout(tick, speed));
      }

      tick();
    });
  }

  /* Renders the whole answer at once, for reduced-motion users. */
  function renderAnswerInstantly() {
    var html = '<p>' + INTRO + '</p><ul>';
    FEATURES.forEach(function (f) {
      html += '<li><b>' + f[0] + '</b>' + f[1] + '</li>';
    });
    html += '</ul><p>' + OUTRO + '</p>';
    answerEl.innerHTML = html;
  }

  /* Streams the answer block by block, with a trailing caret. */
  function streamAnswer(id) {
    var caret = document.createElement('span');
    caret.className = 'stream-caret';
    caret.setAttribute('aria-hidden', 'true');

    function writeText(parent, text, bold) {
      var span = document.createElement(bold ? 'b' : 'span');
      parent.appendChild(span);
      parent.appendChild(caret);
      return typeInto(span, text, 12, id);
    }

    var intro = document.createElement('p');
    answerEl.appendChild(intro);

    var chain = writeText(intro, INTRO, false);

    var list = document.createElement('ul');

    FEATURES.forEach(function (feature, index) {
      chain = chain.then(function () {
        if (id !== runId) return;
        if (index === 0) answerEl.appendChild(list);

        var li = document.createElement('li');
        list.appendChild(li);

        return writeText(li, feature[0], true).then(function () {
          if (id !== runId) return;
          return writeText(li, feature[1], false);
        });
      });
    });

    return chain
      .then(function () {
        if (id !== runId) return;
        var outro = document.createElement('p');
        answerEl.appendChild(outro);
        return writeText(outro, OUTRO, false);
      })
      .then(function () {
        if (caret.parentNode) caret.parentNode.removeChild(caret);
      });
  }

  function playChat() {
    resetChat();
    var id = runId;

    if (reduceMotion) {
      userText.textContent = QUESTION;
      userBubble.classList.add('is-on', 'is-done');
      trace.classList.add('is-on', 'is-done');
      traceText.textContent = 'Used Searching for relevant documents';
      renderAnswerInstantly();
      sourcesEl.classList.add('is-on');
      return;
    }

    wait(220)
      .then(function () {
        if (id !== runId) return;
        userBubble.classList.add('is-on');
        return typeInto(userText, QUESTION, 34, id);
      })
      .then(function () {
        if (id !== runId) return;
        userBubble.classList.add('is-done');
        return wait(380);
      })
      .then(function () {
        if (id !== runId) return;
        trace.classList.add('is-on');
        return wait(1500);
      })
      .then(function () {
        if (id !== runId) return;
        trace.classList.add('is-done');
        traceText.textContent = 'Used Searching for relevant documents';
        return streamAnswer(id);
      })
      .then(function () {
        if (id !== runId) return;
        return wait(260);
      })
      .then(function () {
        if (id !== runId) return;
        sourcesEl.classList.add('is-on');
      });
  }

  if (chatWindow) {
    if (!('IntersectionObserver' in window)) {
      playChat();
    } else {
      var chatObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              playChat();
              chatObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      chatObserver.observe(chatWindow);
    }

    replayBtn.addEventListener('click', playChat);
  }

  /* ---------------------------------------------------------------------
     Cited sources, opened inline beside the conversation
     --------------------------------------------------------------------- */

  var chatSplit = document.getElementById('chatSplit');
  var sourcePanel = document.getElementById('sourcePanel');
  var sourceImage = document.getElementById('sourceImage');
  var sourceTitle = document.getElementById('sourceTitle');
  var sourceClose = document.getElementById('sourceClose');
  var sourceChips = Array.prototype.slice.call(document.querySelectorAll('.source-chip'));

  function closeSource() {
    chatSplit.classList.remove('is-split');
    sourcePanel.setAttribute('hidden', '');
    sourceChips.forEach(function (c) {
      c.classList.remove('is-open');
    });
  }

  if (chatSplit && sourcePanel) {
    sourceChips.forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        /* Let modified clicks fall through to a normal new-tab open. */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();

        var label = 'OpenRAG.pdf (page: ' + chip.dataset.page + ')';

        sourceChips.forEach(function (c) {
          c.classList.toggle('is-open', c === chip);
        });

        sourceTitle.textContent = label;
        sourceImage.src = chip.getAttribute('href');
        sourceImage.alt = label;

        sourcePanel.removeAttribute('hidden');
        chatSplit.classList.add('is-split');
      });
    });

    sourceClose.addEventListener('click', closeSource);
  }

  /* ---------------------------------------------------------------------
     Video answer
     A second chat exchange whose answer is the explainer video. The video
     starts when it scrolls into view and pauses again when it leaves.
     --------------------------------------------------------------------- */

  var VIDEO_QUESTION = 'Can you explain RAG to me in five minutes?';
  var VIDEO_ANSWER =
    'Yes. The clearest source in this partition is a five-minute explainer produced by ' +
    'LINAGORA. It was indexed like any other document: the audio was transcribed, the ' +
    'transcript chunked and embedded, so the video itself is citable. Here it is, playing ' +
    'from the start:';

  var videoChat = document.getElementById('videoChat');
  var videoUser = document.getElementById('videoUser');
  var videoUserText = document.getElementById('videoUserText');
  var videoTrace = document.getElementById('videoTrace');
  var videoTraceText = document.getElementById('videoTraceText');
  var videoAnswer = document.getElementById('videoAnswer');
  var videoFrame = document.getElementById('videoFrame');
  var ragVideo = document.getElementById('ragVideo');
  var videoReplay = document.getElementById('videoReplay');

  var videoRunId = 0;
  var videoTimers = [];
  /* Set once the viewer takes manual control, so scrolling stops overriding them. */
  var userDrivesVideo = false;

  function videoWait(ms) {
    return new Promise(function (resolve) {
      videoTimers.push(setTimeout(resolve, ms));
    });
  }

  function typeIntoVideo(node, text, speed, id) {
    return new Promise(function (resolve) {
      var i = 0;

      function tick() {
        if (id !== videoRunId) return resolve();
        i = Math.min(text.length, i + Math.max(1, Math.round(Math.random() * 2) + 1));
        node.textContent = text.slice(0, i);
        if (i >= text.length) return resolve();
        videoTimers.push(setTimeout(tick, speed));
      }

      tick();
    });
  }

  function playVideoChat() {
    videoTimers.forEach(clearTimeout);
    videoTimers = [];
    videoRunId += 1;
    var id = videoRunId;

    videoUserText.textContent = '';
    videoUser.classList.remove('is-on', 'is-done');
    videoTrace.classList.remove('is-on', 'is-done');
    videoTraceText.textContent = 'Searching for relevant documents…';
    videoAnswer.textContent = '';
    videoFrame.classList.remove('is-on');

    if (reduceMotion) {
      videoUserText.textContent = VIDEO_QUESTION;
      videoUser.classList.add('is-on', 'is-done');
      videoTrace.classList.add('is-on', 'is-done');
      videoTraceText.textContent = 'Used Searching for relevant documents';
      videoAnswer.innerHTML = '<p>' + VIDEO_ANSWER + '</p>';
      videoFrame.classList.add('is-on');
      return;
    }

    videoWait(200)
      .then(function () {
        if (id !== videoRunId) return;
        videoUser.classList.add('is-on');
        return typeIntoVideo(videoUserText, VIDEO_QUESTION, 32, id);
      })
      .then(function () {
        if (id !== videoRunId) return;
        videoUser.classList.add('is-done');
        return videoWait(340);
      })
      .then(function () {
        if (id !== videoRunId) return;
        videoTrace.classList.add('is-on');
        return videoWait(1300);
      })
      .then(function () {
        if (id !== videoRunId) return;
        videoTrace.classList.add('is-done');
        videoTraceText.textContent = 'Used Searching for relevant documents';
        var p = document.createElement('p');
        videoAnswer.appendChild(p);
        return typeIntoVideo(p, VIDEO_ANSWER, 12, id);
      })
      .then(function () {
        if (id !== videoRunId) return;
        videoFrame.classList.add('is-on');
      });
  }

  if (videoChat && ragVideo) {
    /* Once the viewer touches the player, stop steering it from scroll.
       Media events (play/pause) are trusted even when fired programmatically,
       so intent has to come from real pointer/keyboard interaction instead. */
    ['pointerdown', 'keydown'].forEach(function (evt) {
      ragVideo.addEventListener(evt, function () {
        userDrivesVideo = true;
      });
    });

    if ('IntersectionObserver' in window) {
      /* The window is tall, so the exchange starts on a light touch... */
      var chatStarted = false;

      var chatObserver2 = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && !chatStarted) {
              chatStarted = true;
              playVideoChat();
              chatObserver2.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      chatObserver2.observe(videoChat);

      /* ...while playback follows the player itself being on screen. */
      var playObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (userDrivesVideo || reduceMotion) return;

            if (entry.isIntersecting) {
              var attempt = ragVideo.play();
              if (attempt && attempt.catch) attempt.catch(function () {});
            } else {
              ragVideo.pause();
            }
          });
        },
        { threshold: 0.5 }
      );

      playObserver.observe(videoFrame);
    } else {
      playVideoChat();
    }

    videoReplay.addEventListener('click', function () {
      userDrivesVideo = false;
      ragVideo.pause();
      ragVideo.currentTime = 0;
      playVideoChat();
    });
  }

  /* ---------------------------------------------------------------------
     Console tabs
     --------------------------------------------------------------------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.console-tab'));
  var views = Array.prototype.slice.call(document.querySelectorAll('.console-view'));

  function selectTab(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    views.forEach(function (v) {
      var on = v.id === tab.dataset.view;
      v.classList.toggle('is-active', on);
      if (on) {
        v.removeAttribute('hidden');
      } else {
        v.setAttribute('hidden', '');
      }
    });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      selectTab(tab);
    });

    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1
        : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = tabs[(index + dir + tabs.length) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });

  /* ---------------------------------------------------------------------
     Copy the integration snippet
     --------------------------------------------------------------------- */

  var copyBtn = document.getElementById('copyCode');
  var codeBlock = document.getElementById('codeBlock');

  if (copyBtn && codeBlock && navigator.clipboard) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(codeBlock.textContent).then(
        function () {
          copyBtn.textContent = 'Copied';
          setTimeout(function () {
            copyBtn.textContent = 'Copy';
          }, 1800);
        },
        function () {
          copyBtn.textContent = 'Press Ctrl+C';
          setTimeout(function () {
            copyBtn.textContent = 'Copy';
          }, 1800);
        }
      );
    });
  } else if (copyBtn) {
    copyBtn.hidden = true;
  }
})();

/* ==========================================================================
   Contact dialog

   The address is never present in the page. It ships encrypted with AES-GCM
   under a key that exists only once the visitor's browser has redone an
   iterated PBKDF2 derivation, costing a fraction of a second of CPU.

   Harvesters that do not execute JavaScript get nothing at all. A headless
   crawler would have to drive the form and pay that cost on every page it
   visits, which does not pay at harvesting scale. It is a cost barrier, not
   a secret: nothing is withheld from the constants below.

   Regenerate them with tools/encrypt-address.mjs.
   ========================================================================== */

(function () {
  'use strict';

  var dialog = document.getElementById('contactDialog');
  var form = document.getElementById('contactForm');
  if (!dialog || !form || !dialog.showModal) return;

  var triggers = document.querySelectorAll('.contact-trigger');
  var closeBtn = document.getElementById('contactClose');
  var humanBox = document.getElementById('cfHuman');
  var statusEl = document.getElementById('contactStatus');
  var progress = document.getElementById('contactProgress');
  var bar = document.getElementById('contactBar');
  var note = document.getElementById('contactNote');
  var fallback = document.getElementById('contactFallback');
  var addressEl = document.getElementById('contactAddress');
  var copyBtn = document.getElementById('contactCopy');
  var sendBtn = form.querySelector('.contact-send');

  var nameEl = document.getElementById('cfName');
  var emailEl = document.getElementById('cfEmail');
  var companyEl = document.getElementById('cfCompany');
  var inquiryEl = document.getElementById('cfInquiry');
  var messageEl = document.getElementById('cfMessage');

  var POW_SALT = 'SHdiudyez8Xxwy/EtqfHtw==';
  var POW_IV = 'eo6hDINSMpwozEuK';
  var POW_CIPHER = 'HZsJtTRo1mU4QKz463xaAlUdP/NbxZiX3gqq8fzMYx6ECOTv';
  var POW_CHUNKS = 20;
  var POW_ITERS = 50000;
  var POW_SEED = 'openrag-contact-v1';

  /* Most mail handlers choke well before the 2048-character shell limit. */
  var MAX_URL = 1900;

  var address = null;
  var pending = null;
  var lastBody = '';
  /* Bumped on every open. Work started before a reopen must not land after it. */
  var session = 0;

  function subtle() {
    return window.crypto && window.crypto.subtle;
  }

  function bytes(base64) {
    var raw = window.atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) {
      out[i] = raw.charCodeAt(i);
    }
    return out;
  }

  function showNote(text) {
    note.textContent = text;
    note.hidden = false;
  }

  function setProgress(fraction) {
    progress.hidden = false;
    bar.style.width = Math.round(fraction * 100) + '%';
  }

  /* One PBKDF2 pass. Each call is asynchronous and hands control back to the
     event loop, which is what keeps the dialog responsive while the work runs
     and lets the progress bar move. */
  function deriveChunk(bits, salt) {
    return subtle()
      .importKey('raw', bits, { name: 'PBKDF2' }, false, ['deriveBits'])
      .then(function (material) {
        return subtle().deriveBits(
          { name: 'PBKDF2', salt: salt, iterations: POW_ITERS, hash: 'SHA-256' },
          material,
          256
        );
      })
      .then(function (out) {
        return new Uint8Array(out);
      });
  }

  /* Built as a factory so each step captures its own index. Work abandoned by
     a reopen still runs to completion, so it must not drive the fresh form's
     progress bar. */
  function step(salt, index, forSession) {
    return function (bits) {
      return deriveChunk(bits, salt).then(function (next) {
        if (forSession === session) setProgress((index + 1) / POW_CHUNKS);
        return next;
      });
    };
  }

  function unlocked() {
    statusEl.textContent = 'Verified';
    statusEl.classList.add('is-done');
    progress.hidden = true;
  }

  /* Every open starts from nothing: the address is decrypted afresh each time,
     and only ever by beginUnlock, which only the checkbox calls. */
  function reset() {
    session++;
    address = null;
    pending = null;
    humanBox.checked = false;
    humanBox.disabled = false;
    statusEl.textContent = '';
    statusEl.classList.remove('is-done');
    progress.hidden = true;
    bar.style.width = '0';
    note.hidden = true;
    fallback.hidden = true;
    sendBtn.disabled = false;
  }

  function beginUnlock() {
    if (pending) return pending;

    var mySession = session;
    var salt = bytes(POW_SALT);
    var chain = Promise.resolve(new TextEncoder().encode(POW_SEED));

    humanBox.disabled = true;
    statusEl.textContent = 'Verifying…';
    setProgress(0);

    for (var i = 0; i < POW_CHUNKS; i++) {
      chain = chain.then(step(salt, i, mySession));
    }

    pending = chain
      .then(function (keyBits) {
        return subtle().importKey('raw', keyBits, { name: 'AES-GCM' }, false, ['decrypt']);
      })
      .then(function (key) {
        /* A wrong key fails the GCM tag check, so this doubles as verification
           that the published constants are intact. */
        return subtle().decrypt({ name: 'AES-GCM', iv: bytes(POW_IV) }, key, bytes(POW_CIPHER));
      })
      .then(function (plain) {
        var value = new TextDecoder().decode(plain);
        /* The dialog was closed and reopened while this ran: drop the result
           rather than mark a fresh form as already verified. */
        if (mySession !== session) return null;
        address = value;
        unlocked();
        return address;
      })
      .catch(function (err) {
        if (mySession === session) pending = null;
        throw err;
      });

    return pending;
  }

  function fail(err) {
    console.error('Contact form: could not unlock the address', err);
    statusEl.textContent = 'Verification failed';
    progress.hidden = true;
    /* Let the visitor tick the box again rather than stranding them. */
    humanBox.disabled = false;
    humanBox.checked = false;
    showNote('Verification failed. Tick the box to try again, or use the GitHub link on the page.');
  }

  function compose() {
    var inquiry = inquiryEl.value;
    var company = companyEl.value.trim();

    lastBody = [
      'Name: ' + nameEl.value.trim(),
      'Company: ' + company,
      'Email: ' + emailEl.value.trim(),
      'Inquiry type: ' + inquiry,
      '',
      'Message:',
      messageEl.value.trim()
    ].join('\r\n');

    addressEl.textContent = address;
    fallback.hidden = false;

    var url =
      'mailto:' +
      address +
      '?subject=' +
      encodeURIComponent('[OpenRAG] ' + inquiry + ' — ' + company) +
      '&body=' +
      encodeURIComponent(lastBody);

    if (url.length > MAX_URL) {
      showNote('That message is too long to hand over to a mail app. Copy it below and send it directly.');
      return;
    }

    window.location.href = url;
  }

  function open() {
    reset();
    dialog.showModal();
    document.documentElement.classList.add('contact-open');
    nameEl.focus();

    if (!subtle()) {
      /* crypto.subtle only exists in a secure context. */
      showNote('A secure (https) connection is required to reveal the contact address. Please use the GitHub link on the page instead.');
      sendBtn.disabled = true;
      humanBox.disabled = true;
    }
  }

  /* The header and footer triggers are real anchors to #contact, so without
     JavaScript they still land on the section and its noscript fallback. */
  Array.prototype.forEach.call(triggers, function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      open();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      dialog.close();
    });
  }

  dialog.addEventListener('close', function () {
    document.documentElement.classList.remove('contact-open');
  });

  /* A click landing on the dialog itself is a click on the backdrop: the form
     covers the whole box. */
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  /* The only thing that starts a decryption. */
  humanBox.addEventListener('change', function () {
    if (humanBox.checked) beginUnlock().catch(fail);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (address) {
      compose();
      return;
    }

    /* The checkbox is required, so reaching here means it was ticked and the
       work is still running. Wait for it rather than starting anything. */
    if (pending) {
      pending.then(function (value) {
        if (value) compose();
      }, fail);
      return;
    }

    /* Reachable after a failed attempt, which clears the in-flight work. */
    showNote('Tick the "I am human" box to continue.');
  });

  if (copyBtn && navigator.clipboard) {
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(lastBody).then(
        function () {
          copyBtn.textContent = 'Copied';
          setTimeout(function () {
            copyBtn.textContent = 'Copy message';
          }, 1800);
        },
        function () {
          copyBtn.textContent = 'Press Ctrl+C';
          setTimeout(function () {
            copyBtn.textContent = 'Copy message';
          }, 1800);
        }
      );
    });
  } else if (copyBtn) {
    copyBtn.hidden = true;
  }
})();
