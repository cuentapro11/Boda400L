// Variables globales
let isPlaying = false;
let player = null;
let playerReady = false;
let currentSlide = 0;
let totalSlides = 0;
let enableMusic = null; // null = aún no elige, true = con música, false = sin música
let wantsAudibleMusic = false; // true cuando el usuario ya tocó "Ingresar con música"

// Inicializar cuando el DOM esté listo
function initializeApp() {
    initializeCountdown();
    initializeCarousel();
    initializeModal();
    initializeSeparatorsAnimation();
    initializeHeroParallax();
    loadYouTubeAPI(); // Se precarga desde el inicio (no en el click) para que
                       // playVideo() pueda ejecutarse de forma síncrona dentro
                       // del gesto del usuario. Esto es lo que exige iOS Safari.
    // Splash permanece hasta que el usuario elija una opción
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Modal de bienvenida
function initializeModal() {
    const enterWithMusic = document.getElementById('enterWithMusic');
    const enterWithoutMusic = document.getElementById('enterWithoutMusic');
    const modal = document.getElementById('welcomeModal');

    function handleEnterWithMusic() {
        enableMusic = true;
        wantsAudibleMusic = true;
        modal.style.display = 'none';
        document.getElementById('musicPlayer').style.display = 'block';

        // El player ya viene sonando en segundo plano, silenciado (ver
        // onPlayerReady). Acá solo le quitamos el mute: eso ocurre de forma
        // síncrona dentro del mismo clic, que es justo lo que iOS Safari
        // exige para permitir sonido en la primera interacción del usuario.
        if (playerReady && player) {
            player.unMute();
            if (!isPlaying) player.playVideo();
            isPlaying = true;
            updateMusicIcon();
        }
        // Si el player todavía no está listo (conexión lenta), onPlayerReady
        // se encarga de activar el sonido apenas termine de inicializar.
    }

    function handleEnterWithoutMusic() {
        enableMusic = false;
        wantsAudibleMusic = false;
        modal.style.display = 'none';

        // Si la música ya había arrancado silenciada de fondo, la pausamos.
        if (playerReady && player) {
            player.pauseVideo();
            isPlaying = false;
        }
    }

    if (enterWithMusic) enterWithMusic.addEventListener('click', handleEnterWithMusic);
    if (enterWithoutMusic) enterWithoutMusic.addEventListener('click', handleEnterWithoutMusic);

    // Fallback por delegación (por si los listeners directos no se adjuntan).
    // Se chequea que el modal siga visible para no duplicar la ejecución
    // cuando el listener directo ya corrió.
    document.addEventListener('click', function(evt) {
        const withBtn = evt.target.closest && evt.target.closest('#enterWithMusic');
        const withoutBtn = evt.target.closest && evt.target.closest('#enterWithoutMusic');
        if (withBtn && modal && modal.style.display !== 'none') {
            handleEnterWithMusic();
        } else if (withoutBtn && modal && modal.style.display !== 'none') {
            handleEnterWithoutMusic();
        }
    });
}

// Parallax exclusivo de la portada en el lado izquierdo
function initializeHeroParallax() {
    const heroLeft = document.querySelector('.hero-left');
    const heroLayer = document.querySelector('.hero-left .hero-left-bg');
    if (!heroLeft || !heroLayer) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqMobile = window.matchMedia('(max-width: 768px)');

    let lastScrollY = window.scrollY || window.pageYOffset;
    let ticking = false;

    const computeSpeed = () => (mqMobile.matches ? 0.35 : 0.2);

    const render = () => {
        const reduce = prefersReducedMotion.matches;
        const rect = heroLeft.getBoundingClientRect();
        const layerHeight = heroLayer.offsetHeight || rect.height * 1.5;
        const viewportH = window.innerHeight || document.documentElement.clientHeight;

        // Unificado: usa rect.top para todas las vistas
        const relativeY = -rect.top; // 0 cuando top toca el borde superior
        const baseSpeed = mqMobile.matches ? 0.45 : 0.2;
        const speed = reduce ? baseSpeed * 0.5 : baseSpeed;
        // Limita el recorrido a un porcentaje de la capa para evitar huecos
        const maxTravel = Math.min(layerHeight * 0.5, rect.height * 0.5);
        const translateRaw = relativeY * speed;
        const translate = Math.max(0, Math.min(maxTravel, translateRaw));
        heroLayer.style.transform = `translate3d(0, ${Math.round(translate)}px, 0)`;

        ticking = false;
    };

    const onScroll = () => {
        lastScrollY = window.scrollY || window.pageYOffset;
        if (!ticking) {
            window.requestAnimationFrame(render);
            ticking = true;
        }
    };

    render();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', render);
    window.addEventListener('touchmove', onScroll, { passive: true });
    window.addEventListener('orientationchange', render);
    window.addEventListener('pageshow', render);
    if (mqMobile && mqMobile.addEventListener) {
        mqMobile.addEventListener('change', render);
    }

    // Asegura actualización incluso si el scroll es en un contenedor (no window)
    let animating = false;
    const tick = () => {
        if (!animating) return;
        render();
        requestAnimationFrame(tick);
    };
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    if (!animating) {
                        animating = true;
                        requestAnimationFrame(tick);
                    }
                } else {
                    animating = false;
                }
            });
        }, { threshold: 0.01 });
        io.observe(heroLeft);
    }
}

// Cargar la API de YouTube
function loadYouTubeAPI() {
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(script);
    window.onYouTubeIframeAPIReady = initializeYouTubePlayer;
}

// Función llamada por la API de YouTube
function initializeYouTubePlayer() {
    player = new YT.Player('youtube-player', {
        height: '1',
        width: '1',
        videoId: 'jb0K64SGsfc',
        playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            loop: 1,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            playlist: 'jb0K64SGsfc'
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    playerReady = true;
    const musicToggle = document.getElementById('musicToggle');
    if (musicToggle) musicToggle.addEventListener('click', toggleMusic);

    // La música arranca silenciada apenas el player está listo (esto no
    // requiere gesto del usuario porque está muteada). Así, cuando el
    // usuario toca "Ingresar con música", solo hace falta "unMute()" -una
    // acción síncrona dentro del clic- para que se escuche de una, incluso
    // en iPhone/Safari.
    event.target.mute();
    event.target.playVideo();
    isPlaying = true;

    if (wantsAudibleMusic) {
        // El usuario ya había elegido "con música" antes de que el player
        // terminara de cargar (ej. conexión lenta): activamos el sonido ya.
        document.getElementById('musicPlayer').style.display = 'block';
        event.target.unMute();
    } else if (enableMusic === false) {
        // El usuario ya eligió "sin música": no hace falta seguir reproduciendo.
        event.target.pauseVideo();
        isPlaying = false;
    }
    updateMusicIcon();
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        isPlaying = true;
    } else if (event.data === YT.PlayerState.PAUSED) {
        isPlaying = false;
    }
    updateMusicIcon();
}

function onPlayerError(event) {
    console.log('Error al cargar el video de YouTube');
    const musicPlayer = document.getElementById('musicPlayer');
    musicPlayer.style.display = 'block';
    isPlaying = false;
    updateMusicIcon();
}

function toggleMusic() {
    if (player) {
        if (isPlaying) {
            player.pauseVideo();
            isPlaying = false;
        } else {
            player.playVideo();
            isPlaying = true;
        }
        updateMusicIcon();
    }
}

function updateMusicIcon() {
    const volumeIcon = document.getElementById('volumeIcon');
    
    if (isPlaying) {
        volumeIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path>
        `;
    } else {
        volumeIcon.innerHTML = `
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
    }
}

// Countdown
function initializeCountdown() {
    const targetDate = new Date('2026-12-31T22:00:00').getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const difference = targetDate - now;
        
        if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24));
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);
            
            document.getElementById('days').textContent = days.toString().padStart(2, '0');
            document.getElementById('hours').textContent = hours.toString().padStart(2, '0');
            document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
            document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        } else {
            document.getElementById('days').textContent = '00';
            document.getElementById('hours').textContent = '00';
            document.getElementById('minutes').textContent = '00';
            document.getElementById('seconds').textContent = '00';
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Carrusel
function initializeCarousel() {
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentSlideElement = document.getElementById('currentSlide');
    const totalSlidesElement = document.getElementById('totalSlides');

    if (!track) return;
    if (track.dataset.loopInit === '1') return; // evitar doble init

    const originalItems = Array.from(track.querySelectorAll('.carousel-item'));
    const originalCount = originalItems.length;
    if (originalCount === 0) return;

    function getVisibleSlides() {
        if (window.innerWidth <= 768) return 1; // móvil
        return 3; // desktop/tablet: siempre 3 visibles
    }

    let visibleSlides = getVisibleSlides();
    totalSlides = originalCount; // para el contador mostrado
    if (totalSlidesElement) totalSlidesElement.textContent = String(totalSlides);

    // Clonar extremos para loop infinito suave
    const prependClones = originalItems.slice(-visibleSlides).map(n => n.cloneNode(true));
    const appendClones = originalItems.slice(0, visibleSlides).map(n => n.cloneNode(true));
    prependClones.forEach(n => track.insertBefore(n, track.firstChild));
    appendClones.forEach(n => track.appendChild(n));

    // Estado del índice en espacio extendido
    let index = visibleSlides; // primer original
    let isTransitioning = false;
    const setTransition = (enabled) => {
        track.style.transition = enabled ? 'transform 0.5s ease-in-out' : 'none';
        isTransitioning = enabled;
    };

    // Medir paso real entre tarjetas: ancho de item (offsetWidth) + gap del track
    const getSlideStepPx = () => {
        const any = track.querySelector('.carousel-item');
        if (!any) return 0;
        const styles = window.getComputedStyle(track);
        const gap = parseFloat(styles.gap || styles.columnGap || '0') || 0;
        const width = any.offsetWidth; // no afectado por transform:scale
        return width + gap;
    };
    const translateTo = () => {
        const step = getSlideStepPx();
        const translateX = -(index) * step;
        // evitar pequeñas fugas por subpíxeles al aplicar transform
        track.style.transform = `translate3d(${translateX.toFixed(3)}px, 0, 0)`;
    };

    // Gestión de centro destacado
    const centerOffset = Math.floor(visibleSlides / 2);
    const updateCenterClass = () => {
        const children = Array.from(track.children);
        children.forEach(el => el.classList && el.classList.remove('is-center'));
        const centerIdx = index + centerOffset;
        const centerEl = children[centerIdx];
        if (centerEl && centerEl.classList) centerEl.classList.add('is-center');
    };

    // Primera posición (sin animación)
    setTransition(false);
    translateTo();
    updateCenterClass();
    requestAnimationFrame(() => setTransition(true));

    const updateCounter = () => {
        const logical = ((index - visibleSlides) % originalCount + originalCount) % originalCount; // 0..originalCount-1
        if (currentSlideElement) currentSlideElement.textContent = String(logical + 1);
    };
    updateCounter();

    const goNext = () => {
        if (isTransitioning) return;
        index += 1;
        setTransition(true);
        translateTo();
        updateCenterClass();
    };
    const goPrev = () => {
        if (isTransitioning) return;
        index -= 1;
        setTransition(true);
        translateTo();
        updateCenterClass();
    };

    nextBtn && nextBtn.addEventListener('click', goNext);
    prevBtn && prevBtn.addEventListener('click', goPrev);

    // Auto-play
    setInterval(goNext, 4000);

    // Snap en bordes de clones
    track.addEventListener('transitionend', () => {
        isTransitioning = false;
        const totalExtended = originalCount + 2 * visibleSlides;
        if (index >= originalCount + visibleSlides) {
            // Pasó al bloque clonado del final -> volver al primer original
            setTransition(false);
            index = visibleSlides;
            translateTo();
            requestAnimationFrame(() => setTransition(true));
        } else if (index < visibleSlides) {
            // Pasó al bloque clonado del inicio -> ir al último original
            setTransition(false);
            index = originalCount + visibleSlides - 1;
            translateTo();
            requestAnimationFrame(() => setTransition(true));
        }
        updateCounter();
        updateCenterClass();
    });

    // Reinit básico en resize (reconstruir clones)
    window.addEventListener('resize', () => {
        const newVisible = getVisibleSlides();
        if (newVisible === visibleSlides) {
            // Solo actualizar la posición con el nuevo ancho
            setTransition(false);
            translateTo();
            updateCenterClass();
            requestAnimationFrame(() => setTransition(true));
            return;
        }
        // Reset: limpiar y reconstruir cuando cambia el número visible
        setTransition(false);
        track.innerHTML = '';
        originalItems.forEach(n => track.appendChild(n));
        track.dataset.loopInit = '';
        initializeCarousel();
    }, { passive: true });

    track.dataset.loopInit = '1';
}

// Las funciones updateCarousel y updateSlideCounter ya no se usan en el bucle infinito

// Funciones de los botones
// NOTA: esta es una plantilla de ejemplo. Los botones de abajo (Cómo llegar,
// Compartir fotos, Regalos y Confirmar asistencia) no tienen un enlace real
// todavía: solo muestran un aviso. Reemplaza cada exampleAction(...) por la
// acción real (enlace de Google Maps, carpeta de Drive, Google Form, etc.)
// cuando uses esta plantilla para una boda real.

const addresses = {
    ceremony: "Iglesia San José, Calle Duarte #45, Santo Domingo, República Dominicana",
    celebration: "Salón Jardín Bella Vista, Av. Independencia #120, Santo Domingo, República Dominicana"
};

function exampleAction(title, message) {
    showToast(title, message);
}

function openLocation(location) {
    // EJEMPLO: reemplaza esto por window.open(mapsUrl, '_blank') con la
    // dirección real, como en la versión comentada más abajo.
    // const address = addresses[location];
    // const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    // window.open(mapsUrl, '_blank');
    exampleAction("Ubicación", "Este botón es de ejemplo. Acá se abrirá el mapa con la dirección real.");
}

function shareFotos() {
    // EJEMPLO: reemplaza esto por window.open(driveUrl, '_blank') con el
    // enlace real de tu carpeta de Google Drive para subir fotos.
    exampleAction("Comparte tus fotos", "Este botón es de ejemplo. Acá se abrirá el enlace real a la carpeta de Google Drive.");
}

function showDressCode() {
    showToast("Dress Code", "Elegante sport - Colores tierra y dorados son bienvenidos 👔");
}

function showTips() {
    showToast("Tips y Notas", "La ceremonia será al aire libre. Se recomienda llegar 15 minutos antes ⛪");
}

function showGifts() {
    // EJEMPLO: reemplaza esto por el enlace o la información real sobre los regalos.
    exampleAction("Nuestro regalo es tu presencia", "Este botón es de ejemplo. Acá irá la información real sobre los regalos.");
}

function confirmAttendance() {
    // EJEMPLO: reemplaza esto por window.open(googleFormUrl, '_blank') con
    // el enlace real de tu Google Form de confirmación de asistencia.
    exampleAction("Confirmar asistencia", "Este botón es de ejemplo. Acá se abrirá el enlace real al formulario de confirmación.");
}

// Sistema de Toast
function showToast(title, message) {
    const toast = document.getElementById('toast');
    const toastContent = document.getElementById('toastContent');
    
    toastContent.innerHTML = `
        <h4 style="font-weight: 600; color: hsl(var(--brown)); margin-bottom: 0.5rem;">${title}</h4>
        <p style="color: hsl(var(--foreground) / 0.7);">${message}</p>
    `;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function initializeSeparatorsAnimation() {
    const sections = document.querySelectorAll('.content section + section');
    if (!('IntersectionObserver' in window) || sections.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('separator-pulse');
            } else {
                entry.target.classList.remove('separator-pulse');
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.2 });

    sections.forEach(sec => observer.observe(sec));
}
