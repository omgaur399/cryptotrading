import sys, re

# 1. Read script.js
with open('frontend/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace direct calls
content = re.sub(r'\bopenAlertSettingsModal\(', 'AlertService.AlertModal.openSettings(', content)
content = re.sub(r'\bopenPriceAlertModal\(', 'AlertService.AlertModal.open(', content)
content = re.sub(r'\brenderAlertLine\(', 'AlertService.AlertRenderer.renderLine(', content)
content = re.sub(r'\bcheckAlerts\(', 'AlertService.AlertRenderer.check(', content)
content = re.sub(r'\bshowNotification\(', 'AlertService.Notification.show(', content)
content = re.sub(r'\bshowAlertsHub\(', 'AlertService.AlertHub.show(', content)
content = re.sub(r'\bupdateNotifBadge\(', 'AlertService.Notification.updateBadge(', content)

# Replace typeof checks
content = content.replace("typeof openPriceAlertModal", "typeof AlertService.AlertModal.open")
content = content.replace("typeof showAlertsHub", "typeof AlertService.AlertHub.show")
content = content.replace("typeof updateNotifBadge", "typeof AlertService.Notification.updateBadge")

lines = content.split('\n')

funcs_to_remove = [
    r'^function AlertService\.AlertRenderer\.renderLine\(',
    r'^function AlertService\.AlertModal\.open\(',
    r'^function AlertService\.AlertModal\.openSettings\(',
    r'^function AlertService\.AlertRenderer\.check\(',
    r'^function AlertService\.Notification\.show\(',
    r'^function AlertService\.AlertHub\.show\(',
    r'^function AlertService\.Notification\.updateBadge\('
]
patterns = [re.compile(p) for p in funcs_to_remove]

out_lines = []
skip = False
brace_count = 0

for line in lines:
    if not skip:
        matched = False
        for p in patterns:
            if p.search(line.strip()):
                skip = True
                brace_count = line.count('{') - line.count('}')
                matched = True
                break
        if not matched:
            out_lines.append(line)
    else:
        brace_count += line.count('{') - line.count('}')
        if brace_count == 0:
            skip = False

# Add initialization
final_out = []
init_added = False
for line in out_lines:
    final_out.append(line)
    if not init_added and 'MarketWidgetService.initialize(' in line:
        final_out.append('AlertService.initialize({ state, saveDrawings, DrawingService: window.DrawingService, ModalService: window.ModalService });')
        init_added = True

# Write back
with open('frontend/script.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(final_out))
