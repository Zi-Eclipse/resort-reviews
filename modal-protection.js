// Prevents modal close when user drags to select text and releases outside the modal.
// Tracks mousedown target; if it doesn't match the mouseup overlay, the close is blocked.
(function() {
    const OVERLAY_CLASSES = ['modal-overlay', 'comment-modal-overlay', 'image-modal-overlay'];

    function isOverlay(el) {
        return el && el.classList && OVERLAY_CLASSES.some(c => el.classList.contains(c));
    }

    let mousedownTarget = null;

    document.addEventListener('mousedown', function(e) {
        mousedownTarget = e.target;
    }, true);

    document.addEventListener('click', function(e) {
        // If the click lands on an overlay but mousedown didn't start on the same overlay,
        // it's a drag-release — block the close.
        if (isOverlay(e.target) && mousedownTarget !== e.target) {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
        }
        mousedownTarget = null;
    }, true);
})();
