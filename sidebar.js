// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "colorsExtracted") {
    // 过滤相似颜色后再显示
    const filteredColors = filterSimilarColors(request.colors);
    displayColors(filteredColors);
  }
});

// 色彩分类函数
function classifyColors(colors) {
  if (!colors || colors.length === 0) return { primary: [], secondary: [], accent: [] };
  
  // 计算每个颜色的饱和度
  const colorsWithSaturation = colors.map(colorData => {
    const rgb = hexToRgb(colorData.color);
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    const saturation = max === 0 ? 0 : (max - min) / max * 100;
    return { ...colorData, saturation };
  });
  
  // 主色：使用占比最高的 1-2 个颜色（占比>=15%或前2个）
  const primary = colorsWithSaturation
    .filter((c, i) => c.percentage >= 15 || i < 2)
    .slice(0, 2);
  
  // 强调色：饱和度高（>30）且占比较小（<15%）的颜色
  const accent = colorsWithSaturation
    .filter(c => c.saturation > 30 && c.percentage < 15 && !primary.includes(c))
    .slice(0, 3);
  
  // 辅色：剩余的颜色
  const secondary = colorsWithSaturation
    .filter(c => !primary.includes(c) && !accent.includes(c))
    .slice(0, 5);
  
  return { primary, secondary, accent };
}

// WCAG 对比度计算
function calculateContrast(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(rgb) {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;
  
  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getContrastLevel(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

// 显示颜色
function displayColors(colors) {
  const container = document.getElementById('colorsContainer');
  const overviewSection = document.getElementById('colorOverview');
  const paletteContainer = document.getElementById('colorPalette');
  const searchFilter = document.getElementById('searchFilter');
  
  if (!colors || colors.length === 0) {
    container.innerHTML = '<div class="empty-state">No colors found on page</div>';
    document.getElementById('colorCount').textContent = '0';
    overviewSection.style.display = 'none';
    if (searchFilter) searchFilter.style.display = 'none';
    return;
  }
  
  // 处理新的数据格式（对象数组 vs 字符串数组）
  const colorDataArray = colors.map(c => 
    typeof c === 'string' ? { color: c, percentage: 0, weight: 0 } : c
  );
  
  // 保存全局数据
  currentColors = colorDataArray;
  
  // 更新颜色数量
  document.getElementById('colorCount').textContent = colorDataArray.length;
  
  // 色彩分类
  currentClassified = classifyColors(colorDataArray);
  
  // 显示搜索过滤区
  if (searchFilter && colorDataArray.length > 0) {
    searchFilter.style.display = 'block';
  }
  
  // 显示颜色概览
  overviewSection.style.display = 'block';
  paletteContainer.innerHTML = '';
  colorDataArray.forEach(colorData => {
    const paletteItem = document.createElement('div');
    paletteItem.className = 'palette-color';
    paletteItem.style.backgroundColor = colorData.color;
    paletteItem.title = `${colorData.color} (${colorData.percentage.toFixed(1)}%)`;
    paletteItem.addEventListener('click', () => {
      copyToClipboard(colorData.color);
      showNotification(`Copied color value: ${colorData.color}`);
    });
    paletteContainer.appendChild(paletteItem);
  });
  
  // 清空容器
  container.innerHTML = '';
  
  // 显示每个颜色及其色阶
  colorDataArray.slice(0, 10).forEach((colorData, index) => {
    const color = colorData.color;
    const colorItem = document.createElement('div');
    colorItem.className = 'color-item';
    colorItem.style.animationDelay = `${index * 0.05}s`;
    
    // 判断颜色分类
    let colorType = '';
    let colorTypeBadge = '';
    if (currentClassified.primary.some(c => c.color === color)) {
      colorType = 'primary';
      colorTypeBadge = '<span class="color-badge badge-primary">Primary</span>';
    } else if (currentClassified.accent.some(c => c.color === color)) {
      colorType = 'accent';
      colorTypeBadge = '<span class="color-badge badge-accent">Accent</span>';
    } else if (currentClassified.secondary.some(c => c.color === color)) {
      colorType = 'secondary';
      colorTypeBadge = '<span class="color-badge badge-secondary">Secondary</span>';
    }
    
    // 生成色阶
    const colorScales = generateColorScale(color);
    
    // 创建主颜色显示
    const mainColorDiv = document.createElement('div');
    mainColorDiv.className = 'main-color';
    
    // 获取颜色的亮度信息
    const brightness = getColorBrightness(color);
    const textColor = brightness > 128 ? '#000000' : '#FFFFFF';
    
    // 使用频率可视化进度条
    const usageBar = colorData.percentage > 0 
      ? `<div class="usage-bar-container">
           <div class="usage-bar" style="width: ${Math.min(colorData.percentage * 2, 100)}%"></div>
           <span class="usage-text">${colorData.percentage.toFixed(1)}%</span>
         </div>`
      : '';
    
    mainColorDiv.innerHTML = `
      <div class="color-preview" style="background-color: ${color};"></div>
      <div class="color-info">
        <div class="color-header">
          <div class="color-hex">${color}</div>
          ${colorTypeBadge}
        </div>
        <div class="color-meta">
          <div class="color-brightness">
            <svg class="icon"><use href="#icon-sun"/></svg>
            ${Math.round(brightness)}
          </div>
          ${usageBar}
        </div>
      </div>
      <div class="color-actions">
        <button class="copy-btn" data-color="${color}" style="background: ${color}; color: ${textColor};" title="Copy color value">
          <svg class="icon"><use href="#icon-copy"/></svg>
        </button>
      </div>
    `;
    
    // 创建色阶显示
    const scaleDiv = document.createElement('div');
    scaleDiv.className = 'color-scale';
    
    colorScales.forEach((scaleColor, index) => {
      const scaleItem = document.createElement('div');
      scaleItem.className = 'scale-item';
      scaleItem.style.backgroundColor = scaleColor;
      scaleItem.setAttribute('data-color', scaleColor);
      scaleItem.title = scaleColor; // 添加 tooltip 显示颜色值
      
      // 移除内部文字标签，避免宽度不一致
      
      // 添加点击复制功能
      scaleItem.addEventListener('click', () => {
        copyToClipboard(scaleColor);
        showNotification(`Copied color value: ${scaleColor}`);
      });
      
      scaleDiv.appendChild(scaleItem);
    });
    
    colorItem.appendChild(mainColorDiv);
    colorItem.appendChild(scaleDiv);
    container.appendChild(colorItem);
  });
}

// 生成颜色的色阶
function generateColorScale(baseColor) {
  const scales = [];
  // 生成11个色阶 (0%, 10%, 20%, ..., 100%)
  for (let i = 0; i <= 10; i++) {
    const factor = i / 10;
    scales.push(shadeColor(baseColor, factor * 200 - 100));
  }
  return scales;
}

// 调整颜色亮度
function shadeColor(color, percent) {
  // 处理十六进制颜色
  let hex = color.replace('#', '');
  
  // 如果是3位十六进制，转换为6位
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  // 解析RGB值
  let R = parseInt(hex.substring(0, 2), 16);
  let G = parseInt(hex.substring(2, 4), 16);
  let B = parseInt(hex.substring(4, 6), 16);

  // 调整亮度
  R = Math.min(255, Math.max(0, R + R * percent / 100));
  G = Math.min(255, Math.max(0, G + G * percent / 100));
  B = Math.min(255, Math.max(0, B + B * percent / 100));

  // 转换回十六进制
  const RR = Math.round(R).toString(16).padStart(2, '0');
  const GG = Math.round(G).toString(16).padStart(2, '0');
  const BB = Math.round(B).toString(16).padStart(2, '0');

  return `#${RR}${GG}${BB}`;
}

// 复制到剪贴板
function copyToClipboard(text) {
  // 使用现代的 Clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copy successful:', text);
    }).catch(err => {
      console.error('Copy failed:', err);
      // 降级到旧方法
      fallbackCopy(text);
    });
  } else {
    // 降级到旧方法
    fallbackCopy(text);
  }
}

// 降级复制方法
function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    console.log('Fallback copy successful:', text);
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }
  document.body.removeChild(textarea);
}

// 显示通知
function showNotification(message) {
  // 移除现有的通知
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
    
  // 创建新通知
  const notification = document.createElement('div');
  notification.className = 'notification notification-success';
  notification.innerHTML = `
    <svg class="icon"><use href="#icon-check"/></svg>
    <span>${message}</span>
  `;
    
  document.body.appendChild(notification);
    
  // 2.5秒后移除通知
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 2500);
}
  
// 获取颜色亮度
function getColorBrightness(hexColor) {
  const rgb = hexToRgb(hexColor);
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

// 在DOM加载完成后添加事件监听器
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  setupEventListeners();
}

function setupEventListeners() {
  // 刷新按钮事件
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      console.log('Refresh button clicked');
      // 显示加载状态
      document.getElementById('colorsContainer').innerHTML = '<div class="empty-state">Re-analyzing page colors...</div>';
      
      // 直接向 content.js 发送提取颜色的消息
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs[0]) {
          console.log('Requesting color extraction from:', tabs[0].url);
          
          // 发送消息让已存在的 content.js 重新提取颜色
          chrome.tabs.sendMessage(tabs[0].id, {action: "extractColors"}, (response) => {
            if (chrome.runtime.lastError) {
              console.log('Content script not loaded, injecting...', chrome.runtime.lastError.message);
              // 如果 content.js 未加载，才重新注入
              chrome.scripting.executeScript({
                target: {tabId: tabs[0].id},
                files: ['content.js']
              }, () => {
                // 等待脚本加载后重新发送消息
                setTimeout(() => {
                  chrome.tabs.sendMessage(tabs[0].id, {action: "extractColors"}, (resp) => {
                    if (resp && resp.colors) {
                      console.log('Received color data after refresh:', resp.colors.length);
                      const filteredColors = filterSimilarColors(resp.colors);
                      displayColors(filteredColors);
                    } else {
                      document.getElementById('colorsContainer').innerHTML = 
                        '<div class="empty-state">Failed to extract colors. Please refresh the page.</div>';
                    }
                  });
                }, 500);
              });
            } else if (response && response.colors) {
              console.log('Received color data after refresh:', response.colors.length);
              const filteredColors = filterSimilarColors(response.colors);
              displayColors(filteredColors);
            } else {
              document.getElementById('colorsContainer').innerHTML = 
                '<div class="empty-state">No colors found. Please refresh the page.</div>';
            }
          });
        }
      });
    });
  }
  
  // 导出按钮事件
  const exportBtn = document.getElementById('exportBtn');
  const exportPanel = document.getElementById('exportPanel');
  const closeExport = document.getElementById('closeExport');
  
  if (exportBtn && exportPanel) {
    exportBtn.addEventListener('click', () => {
      const isVisible = exportPanel.style.display !== 'none';
      exportPanel.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        // 打开导出面板时，关闭其他面板
        if (document.getElementById('contrastPanel')) {
          document.getElementById('contrastPanel').style.display = 'none';
        }
      }
    });
  }
  
  if (closeExport) {
    closeExport.addEventListener('click', () => {
      exportPanel.style.display = 'none';
    });
  }
  
  // 导出选项按钮
  document.querySelectorAll('.export-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      exportColors(format);
    });
  });
  
  // 对比度按钮事件
  const contrastBtn = document.getElementById('contrastBtn');
  const contrastPanel = document.getElementById('contrastPanel');
  const closeContrast = document.getElementById('closeContrast');
  
  if (contrastBtn && contrastPanel) {
    contrastBtn.addEventListener('click', () => {
      const isVisible = contrastPanel.style.display !== 'none';
      contrastPanel.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        // 打开对比度面板时，关闭其他面板
        populateColorPickers();
        if (exportPanel) exportPanel.style.display = 'none';
      }
    });
  }
  
  if (closeContrast) {
    closeContrast.addEventListener('click', () => {
      contrastPanel.style.display = 'none';
    });
  }
  
  // 对比度模式切换
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const manualMode = document.getElementById('manualMode');
      const autoMode = document.getElementById('autoMode');
      
      if (mode === 'manual') {
        manualMode.style.display = 'block';
        autoMode.style.display = 'none';
      } else {
        manualMode.style.display = 'none';
        autoMode.style.display = 'block';
      }
    });
  });
  
  // 页面扫描按钮
  const scanPageBtn = document.getElementById('scanPageBtn');
  if (scanPageBtn) {
    scanPageBtn.addEventListener('click', () => {
      scanPageContrast();
    });
  }
  
  // 搜索过滤功能
  const colorSearch = document.getElementById('colorSearch');
  if (colorSearch) {
    colorSearch.addEventListener('input', (e) => {
      filterColors(e.target.value);
    });
  }
  
  // 过滤按钮
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      applyColorFilter(filter);
    });
  });
  
  // 使用事件委托处理复制按钮点击
  const colorsContainer = document.getElementById('colorsContainer');
  if (colorsContainer) {
    colorsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('copy-btn')) {
        const color = e.target.getAttribute('data-color');
        copyToClipboard(color);
        showNotification(`Copied color value: ${color}`);
      }
    });
  }
}

// 初始化函数
function initializeSidebar() {
  console.log('初始化侧边栏...');
  
  // 尝试从当前标签页获取颜色
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      console.log('当前标签页:', tabs[0].url);
      
      // 发送消息到内容脚本
      chrome.tabs.sendMessage(tabs[0].id, {action: "extractColors"}, (response) => {
        if (chrome.runtime.lastError) {
          console.log('消息发送失败，重新注入脚本:', chrome.runtime.lastError.message);
          // 如果内容脚本未加载，重新注入
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }, () => {
            // 等待脚本加载后再次尝试
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {action: "extractColors"}, (response) => {
                if (response && response.colors) {
                  console.log('收到颜色数据:', response.colors.length);
                  const filteredColors = filterSimilarColors(response.colors);
                  displayColors(filteredColors);
                }
              });
            }, 500);
          });
        } else if (response && response.colors) {
          console.log('收到颜色数据:', response.colors.length);
          const filteredColors = filterSimilarColors(response.colors);
          displayColors(filteredColors);
        }
      });
    }
  });
}

// 页面加载时初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
  initializeSidebar();
}

// 过滤掉过于相似的颜色
function filterSimilarColors(colors) {
  const filtered = [];
  const threshold = 30; // 颜色差异阈值
  
  for (const colorData of colors) {
    const color = typeof colorData === 'string' ? colorData : colorData.color;
    let isSimilar = false;
    
    for (const filteredData of filtered) {
      const filteredColor = typeof filteredData === 'string' ? filteredData : filteredData.color;
      if (colorDistance(color, filteredColor) < threshold) {
        isSimilar = true;
        break;
      }
    }
    
    if (!isSimilar) {
      filtered.push(colorData);
    }
  }
  
  return filtered.slice(0, 10); // 最多返回10种颜色
}

// 计算两个颜色之间的差异
function colorDistance(color1, color2) {
  // 处理可能的对象格式
  const c1 = typeof color1 === 'string' ? color1 : color1.color;
  const c2 = typeof color2 === 'string' ? color2 : color2.color;
  
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

// 将十六进制颜色转换为RGB对象
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// 扫描页面对比度问题
function scanPageContrast() {
  const scanBtn = document.getElementById('scanPageBtn');
  const scanResults = document.getElementById('scanResults');
  
  if (!scanBtn || !scanResults) return;
  
  // 显示加载状态
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<svg class="icon"><use href="#icon-refresh"/></svg> Scanning...';
  scanResults.innerHTML = '<div class="scan-empty">Analyzing page elements...</div>';
  
  // 请求当前标签页扫描
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "scanContrast"}, (response) => {
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<svg class="icon"><use href="#icon-search"/></svg> Scan Page Contrast Issues';
        
        if (response && response.issues) {
          displayContrastIssues(response.issues);
        } else {
          scanResults.innerHTML = '<div class="scan-empty">Scan failed, please try again</div>';
        }
      });
    }
  });
}

// 显示对比度问题
function displayContrastIssues(issues) {
  const scanResults = document.getElementById('scanResults');
  if (!scanResults) return;
  
  if (issues.length === 0) {
    scanResults.innerHTML = '<div class="scan-empty success">✅ Great! No contrast issues found</div>';
    return;
  }
  
  scanResults.innerHTML = '';
  
  issues.forEach((issue, index) => {
    const issueItem = document.createElement('div');
    issueItem.className = 'issue-item';
    issueItem.setAttribute('data-element-index', issue.elementIndex);
    
    const fgBrightness = getColorBrightness(issue.foreground);
    const bgBrightness = getColorBrightness(issue.background);
    const fgTextColor = fgBrightness > 128 ? '#000' : '#fff';
    const bgTextColor = bgBrightness > 128 ? '#000' : '#fff';
    
    issueItem.innerHTML = `
      <div class="issue-header">
        <div class="issue-ratio">${issue.ratio.toFixed(2)}:1</div>
        <div class="issue-level">FAIL</div>
      </div>
      <div class="issue-preview" style="background: ${issue.background}; color: ${issue.foreground}; padding: 12px; border-radius: 6px; margin-bottom: 10px; font-size: 14px; line-height: 1.5;">
        ${issue.text.substring(0, 80) + (issue.text.length > 80 ? '...' : '')}
      </div>
      <div class="issue-colors">
        <div class="issue-color-block" style="background: ${issue.foreground}; color: ${fgTextColor};">
          Foreground: ${issue.foreground}
        </div>
        <div class="issue-color-block" style="background: ${issue.background}; color: ${bgTextColor};">
          Background: ${issue.background}
        </div>
      </div>
      <div class="issue-location">
        <svg class="icon" style="width: 12px; height: 12px;"><use href="#icon-search"/></svg>
        ${issue.selector}
      </div>
    `;
    
    // 添加点击高亮功能
    issueItem.style.cursor = 'pointer';
    issueItem.addEventListener('click', () => {
      highlightElementOnPage(issue.elementIndex);
      // 添加视觉反馈
      issueItem.style.borderColor = '#667eea';
      setTimeout(() => {
        issueItem.style.borderColor = '#e74c3c';
      }, 1000);
    });
    
    scanResults.appendChild(issueItem);
  });
  
  // 添加总结和提示
  const summary = document.createElement('div');
  summary.style.cssText = 'text-align: center; padding: 16px; color: #7f8c8d; font-size: 13px; margin-top: 10px; background: #f8f9fa; border-radius: 8px;';
  summary.innerHTML = `
    Found <strong style="color: #e74c3c;">${issues.length}</strong> contrast issues<br>
    <span style="font-size: 11px; margin-top: 4px; display: inline-block;">💡 Click issue cards to highlight positions on page</span>
  `;
  scanResults.appendChild(summary);
}

// 在页面上高亮显示元素
function highlightElementOnPage(elementIndex) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "highlightElement",
        elementIndex: elementIndex
      });
    }
  });
}
let currentClassified = { primary: [], secondary: [], accent: [] };

// 导出颜色功能
function exportColors(format) {
  if (!currentColors || currentColors.length === 0) {
    showNotification('No color data to export');
    return;
  }
  
  let output = '';
  
  switch(format) {
    case 'css':
      output = generateCSSVariables();
      break;
    case 'tailwind':
      output = generateTailwindConfig();
      break;
    case 'figma':
      output = generateFigmaJSON();
      break;
    case 'json':
      output = JSON.stringify(currentColors, null, 2);
      break;
  }
  
  // 复制到剪贴板
  copyToClipboard(output);
  showNotification(`Copied ${format.toUpperCase()} color data`);
}

function generateCSSVariables() {
  let css = ':root {\n';
  
  // 主色
  currentClassified.primary.forEach((c, i) => {
    css += `  --color-primary-${i + 1}: ${c.color};\n`;
  });
  
  // 辅色
  currentClassified.secondary.forEach((c, i) => {
    css += `  --color-secondary-${i + 1}: ${c.color};\n`;
  });
  
  // 强调色
  currentClassified.accent.forEach((c, i) => {
    css += `  --color-accent-${i + 1}: ${c.color};\n`;
  });
  
  css += '}';
  return css;
}

function generateTailwindConfig() {
  const config = {
    theme: {
      extend: {
        colors: {
          primary: {},
          secondary: {},
          accent: {}
        }
      }
    }
  };
  
  currentClassified.primary.forEach((c, i) => {
    config.theme.extend.colors.primary[((i + 1) * 100).toString()] = c.color;
  });
  
  currentClassified.secondary.forEach((c, i) => {
    config.theme.extend.colors.secondary[((i + 1) * 100).toString()] = c.color;
  });
  
  currentClassified.accent.forEach((c, i) => {
    config.theme.extend.colors.accent[((i + 1) * 100).toString()] = c.color;
  });
  
  return JSON.stringify(config, null, 2);
}

function generateFigmaJSON() {
  const figmaColors = [];
  
  currentClassified.primary.forEach((c, i) => {
    figmaColors.push({
      name: `Primary/${i + 1}`,
      color: hexToRgbNormalized(c.color)
    });
  });
  
  currentClassified.secondary.forEach((c, i) => {
    figmaColors.push({
      name: `Secondary/${i + 1}`,
      color: hexToRgbNormalized(c.color)
    });
  });
  
  currentClassified.accent.forEach((c, i) => {
    figmaColors.push({
      name: `Accent/${i + 1}`,
      color: hexToRgbNormalized(c.color)
    });
  });
  
  return JSON.stringify({ colors: figmaColors }, null, 2);
}

function hexToRgbNormalized(hex) {
  const rgb = hexToRgb(hex);
  return {
    r: rgb.r / 255,
    g: rgb.g / 255,
    b: rgb.b / 255,
    a: 1
  };
}

// 填充颜色选择器
function populateColorPickers() {
  const fgPicker = document.getElementById('fgColorPicker');
  const bgPicker = document.getElementById('bgColorPicker');
  
  if (!fgPicker || !bgPicker || !currentColors) return;
  
  fgPicker.innerHTML = '';
  bgPicker.innerHTML = '';
  
  let selectedFg = null;
  let selectedBg = null;
  
  currentColors.forEach((colorData, index) => {
    const color = colorData.color;
    
    // 前景色选择器
    const fgColor = document.createElement('div');
    fgColor.className = 'picker-color';
    fgColor.style.backgroundColor = color;
    fgColor.addEventListener('click', () => {
      document.querySelectorAll('#fgColorPicker .picker-color').forEach(c => c.classList.remove('selected'));
      fgColor.classList.add('selected');
      selectedFg = color;
      if (selectedBg) updateContrastResult(selectedFg, selectedBg);
    });
    fgPicker.appendChild(fgColor);
    
    // 背景色选择器
    const bgColor = document.createElement('div');
    bgColor.className = 'picker-color';
    bgColor.style.backgroundColor = color;
    bgColor.addEventListener('click', () => {
      document.querySelectorAll('#bgColorPicker .picker-color').forEach(c => c.classList.remove('selected'));
      bgColor.classList.add('selected');
      selectedBg = color;
      if (selectedFg) updateContrastResult(selectedFg, selectedBg);
    });
    bgPicker.appendChild(bgColor);
    
    // 默认选择前两个颜色
    if (index === 0) {
      fgColor.click();
    }
    if (index === 1) {
      bgColor.click();
    }
  });
}

function updateContrastResult(fgColor, bgColor) {
  const ratio = calculateContrast(fgColor, bgColor);
  const level = getContrastLevel(ratio);
  const resultDiv = document.getElementById('contrastResult');
  
  if (!resultDiv) return;
  
  let levelClass = 'level-fail';
  if (level === 'AAA') levelClass = 'level-aaa';
  else if (level.startsWith('AA')) levelClass = 'level-aa';
  
  resultDiv.innerHTML = `
    <div class="contrast-ratio">${ratio.toFixed(2)}:1</div>
    <div class="contrast-level ${levelClass}">${level}</div>
    <div class="contrast-preview" style="background: ${bgColor}; color: ${fgColor};">
      Sample Text
    </div>
    <div style="margin-top: 12px; font-size: 12px; color: #7f8c8d;">
      <div>WCAG AA Standard: Normal text 4.5:1, Large text 3:1</div>
      <div>WCAG AAA Standard: Normal text 7:1, Large text 4.5:1</div>
    </div>
  `;
}

// 颜色搜索过滤
function filterColors(searchTerm) {
  const colorItems = document.querySelectorAll('.color-item');
  
  colorItems.forEach(item => {
    const hexValue = item.querySelector('.color-hex').textContent;
    if (hexValue.toLowerCase().includes(searchTerm.toLowerCase())) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// 应用颜色分类过滤
function applyColorFilter(filter) {
  const colorItems = document.querySelectorAll('.color-item');
  
  colorItems.forEach(item => {
    if (filter === 'all') {
      item.style.display = '';
    } else {
      const badge = item.querySelector(`.badge-${filter}`);
      item.style.display = badge ? '' : 'none';
    }
  });
}

