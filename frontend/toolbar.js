document.addEventListener('DOMContentLoaded', () => {
    // 1. Define setDrawingTool globally
    window.setDrawingTool = function(tool) {
        if (window.drawingManager) {
            window.drawingManager.setTool(tool);
        }
        
        // Apply drawingMode and cursor to all charts
        if (typeof state !== 'undefined' && state.charts) {
            const isClickTool = ['hline', 'vline', 'buyMarker', 'sellMarker', 'priceAlert'].includes(tool);
            Object.values(state.charts).forEach(chartData => {
                chartData.drawingMode = isClickTool ? tool : null;
                const container = document.getElementById(`${chartData.id}-container`);
                if (container) {
                    container.style.cursor = (tool && tool !== 'cursor') ? 'crosshair' : 'default';
                }
            });
        }
        
        // Update all simple toolbar buttons
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            if (btn.dataset.tool === tool) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Update dropdown items
        document.querySelectorAll('.toolbar-dropdown-item').forEach(item => {
            if (item.dataset.tool === tool) {
                item.classList.add('active-tool');
            } else {
                item.classList.remove('active-tool');
            }
        });
    };

    // 2. Add click listeners to all simple toolbar buttons
    document.querySelectorAll('.toolbar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tool = btn.dataset.tool;
            if (tool) {
                window.setDrawingTool(tool);
            }
        });
    });

    // 3. Dropdown Logic for Shape Group
    const shapeGroupArrow = document.getElementById('shape-group-arrow');
    const shapeDropdown = document.getElementById('shape-dropdown');
    const shapeGroupBtn = document.getElementById('shape-group-btn');

    if (shapeGroupArrow && shapeDropdown) {
        shapeGroupArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            shapeDropdown.classList.toggle('open');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!shapeGroupArrow.contains(e.target) && !shapeDropdown.contains(e.target)) {
                shapeDropdown.classList.remove('open');
            }
        });
    }

    // 4. Dropdown item click logic
    document.querySelectorAll('.toolbar-dropdown-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tool = item.dataset.tool;
            const svgHtml = item.querySelector('svg').outerHTML;
            const title = item.innerText.trim();

            // Update the main group button's icon and data-tool
            if (shapeGroupBtn) {
                shapeGroupBtn.innerHTML = svgHtml;
                shapeGroupBtn.dataset.tool = tool;
                shapeGroupBtn.title = title;
            }

            // Close the dropdown
            if (shapeDropdown) {
                shapeDropdown.classList.remove('open');
            }

            // Activate the tool
            window.setDrawingTool(tool);
        });
    });

    // 5. Clear drawings button logic
    const clearDrawingsBtn = document.getElementById('clear-drawings-btn');
    if (clearDrawingsBtn) {
        clearDrawingsBtn.addEventListener('click', () => {
            if (window.clearAllDrawings) {
                if (confirm('Are you sure you want to clear all drawings from all charts?')) {
                    window.clearAllDrawings();
                }
            }
        });
    }
});
