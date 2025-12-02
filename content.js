// 提取网页中的所有颜色（带使用频率数据）
function extractColors() {
  const colorMap = new Map(); // 使用Map来记录颜色出现的频率
  let totalWeight = 0;
  
  // 获取更多类型的元素，包括伪元素和装饰性元素
  const elements = document.querySelectorAll('*');
  
  // 尝试获取伪元素颜色
  function getPseudoElementColors(element) {
    const pseudoElements = ['::before', '::after'];
    const pseudoColors = [];
    
    pseudoElements.forEach(pseudo => {
      try {
        const computedStyle = window.getComputedStyle(element, pseudo);
        const bgColor = computedStyle.backgroundColor;
        const color = computedStyle.color;
        
        const hexBgColor = extractAndResolveColor(bgColor, element);
        if (hexBgColor) {
          pseudoColors.push({type: 'background', color: hexBgColor});
        }
        
        const hexColor = extractAndResolveColor(color, element);
        if (hexColor) {
          pseudoColors.push({type: 'text', color: hexColor});
        }
      } catch (e) {
        // 忽略错误
      }
    });
    
    return pseudoColors;
  }
  
  // 处理 SVG 元素颜色
  function getSVGElementColors(element) {
    const svgColors = [];
    
    // 处理 SVG 元素的 fill 和 stroke 属性
    if (element.tagName.toLowerCase().startsWith('svg') || 
        ['path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon'].includes(element.tagName.toLowerCase())) {
      
      const fill = element.getAttribute('fill') || window.getComputedStyle(element).fill;
      const stroke = element.getAttribute('stroke') || window.getComputedStyle(element).stroke;
      
      const hexFill = extractAndResolveColor(fill, element);
      if (hexFill && hexFill !== 'none') {
        svgColors.push({type: 'fill', color: hexFill});
      }
      
      const hexStroke = extractAndResolveColor(stroke, element);
      if (hexStroke && hexStroke !== 'none') {
        svgColors.push({type: 'stroke', color: hexStroke});
      }
    }
    
    return svgColors;
  }
  
  elements.forEach(element => {
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    // 计算元素面积权重
    const area = rect.width * rect.height;
    
    // 过滤掉太小的元素，但降低阈值以捕获更多细节
    if (area < 5) return;
    
    // 提取背景色
    const backgroundColor = computedStyle.backgroundColor;
    const hexBgColor = extractAndResolveColor(backgroundColor, element);
    if (hexBgColor) {
      // 降低黑色和白色的权重，避免过度提取
      let weight = area;
      if (hexBgColor === '#000000' || hexBgColor === '#FFFFFF') {
        weight = area * 0.3; // 黑色和白色权重减少 70%
      }
      colorMap.set(hexBgColor, (colorMap.get(hexBgColor) || 0) + weight);
      totalWeight += weight;
    }
    
    // 提取文字颜色
    const color = computedStyle.color;
    const hexColor = extractAndResolveColor(color, element);
    if (hexColor) {
      // 降低黑色文字的权重
      let weight = area / 8; // 提高文字颜色权重（从10降到8）
      if (hexColor === '#000000') {
        weight = area / 30; // 黑色文字权重稍作调整
      }
      colorMap.set(hexColor, (colorMap.get(hexColor) || 0) + weight);
      totalWeight += weight;
    }
    
    // 提取边框颜色
    const borderColor = computedStyle.borderColor;
    const hexBorderColor = extractAndResolveColor(borderColor, element);
    if (hexBorderColor) {
      let weight = area / 4; // 提高边框颜色权重（从5降到4）
      if (hexBorderColor === '#000000') {
        weight = area / 15; // 黑色边框权重稍作调整
      }
      colorMap.set(hexBorderColor, (colorMap.get(hexBorderColor) || 0) + weight);
      totalWeight += weight;
    }
    
    // 提取轮廓颜色（outline）
    const outlineColor = computedStyle.outlineColor;
    const hexOutlineColor = extractAndResolveColor(outlineColor, element);
    if (hexOutlineColor) {
      let weight = area / 6; // 轮廓颜色权重
      if (hexOutlineColor === '#000000') {
        weight = area / 20;
      }
      colorMap.set(hexOutlineColor, (colorMap.get(hexOutlineColor) || 0) + weight);
      totalWeight += weight;
    }
    
    // 提取阴影颜色
    const boxShadow = computedStyle.boxShadow;
    if (boxShadow && boxShadow !== 'none') {
      // 简单解析box-shadow中的颜色（仅处理第一个颜色）
      const colorMatch = boxShadow.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|var\([^)]+\))/);
      if (colorMatch) {
        const hexShadowColor = extractAndResolveColor(colorMatch[1], element);
        if (hexShadowColor) {
          let weight = area / 10; // 阴影颜色权重较低
          if (hexShadowColor === '#000000') {
            weight = area / 40;
          }
          colorMap.set(hexShadowColor, (colorMap.get(hexShadowColor) || 0) + weight);
          totalWeight += weight;
        }
      }
    }
    
    // 提取文本装饰颜色
    const textDecorationColor = computedStyle.textDecorationColor;
    const hexTextDecColor = extractAndResolveColor(textDecorationColor, element);
    if (hexTextDecColor) {
      let weight = area / 12; // 文本装饰颜色权重较低
      if (hexTextDecColor === '#000000') {
        weight = area / 50;
      }
      colorMap.set(hexTextDecColor, (colorMap.get(hexTextDecColor) || 0) + weight);
      totalWeight += weight;
    }
    
    // 提取列规则颜色
    const columnRuleColor = computedStyle.columnRuleColor;
    const hexColumnColor = extractAndResolveColor(columnRuleColor, element);
    if (hexColumnColor) {
      let weight = area / 10;
      if (hexColumnColor === '#000000') {
        weight = area / 40;
      }
      colorMap.set(hexColumnColor, (colorMap.get(hexColumnColor) || 0) + weight);
      totalWeight += weight;
    }
    
    // 获取伪元素颜色
    const pseudoColors = getPseudoElementColors(element);
    pseudoColors.forEach(pseudoColor => {
      // 颜色已经是 HEX 格式，不需要再转换
      let weight = area / (pseudoColor.type === 'background' ? 5 : 10);
      if (pseudoColor.color === '#000000') {
        weight = area / (pseudoColor.type === 'background' ? 20 : 40);
      }
      colorMap.set(pseudoColor.color, (colorMap.get(pseudoColor.color) || 0) + weight);
      totalWeight += weight;
    });
    
    // 获取 SVG 元素颜色
    const svgColors = getSVGElementColors(element);
    svgColors.forEach(svgColor => {
      // 颜色已经是 HEX 格式，不需要再转换
      let weight = area / (svgColor.type === 'fill' ? 6 : 8);
      if (svgColor.color === '#000000') {
        weight = area / (svgColor.type === 'fill' ? 25 : 35);
      }
      colorMap.set(svgColor.color, (colorMap.get(svgColor.color) || 0) + weight);
      totalWeight += weight;
    });
  });
  
  // 按照出现频率排序，返回前30种颜色（增加数量以提高全面性）
  return Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(entry => ({
      color: entry[0],
      weight: entry[1],
      percentage: totalWeight > 0 ? (entry[1] / totalWeight * 100) : 0
    }));
}

// 将RGB格式转换为十六进制格式
function rgbToHex(rgb) {
  // 如果已经是十六进制格式，直接返回
  if (rgb.startsWith('#')) {
    return rgb;
  }
  
  // 处理rgb()格式
  const result = rgb.match(/\d+/g);
  if (result) {
    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);
    
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
  }
  
  return rgb;
}

// 解析 CSS 变量，获取真实的颜色值
function resolveCSSVariable(colorValue, element) {
  if (!colorValue) return null;
  
  // 如果不是 CSS 变量，直接返回
  if (!colorValue.includes('var(')) {
    return colorValue;
  }
  
  try {
    // 提取 CSS 变量名
    const varMatch = colorValue.match(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/);
    if (!varMatch) return colorValue;
    
    const varName = varMatch[1];  // 例如：--rs-green-500
    const fallback = varMatch[2]; // 后备值
    
    // 使用 getPropertyValue 获取变量的真实值
    const computedStyle = window.getComputedStyle(element);
    let resolvedValue = computedStyle.getPropertyValue(varName).trim();
    
    // 如果没有获取到值，尝试从 root 元素获取
    if (!resolvedValue) {
      const rootStyle = window.getComputedStyle(document.documentElement);
      resolvedValue = rootStyle.getPropertyValue(varName).trim();
    }
    
    // 如果仍然没有获取到值，尝试从 body 元素获取
    if (!resolvedValue && document.body) {
      const bodyStyle = window.getComputedStyle(document.body);
      resolvedValue = bodyStyle.getPropertyValue(varName).trim();
    }
    
    // 如果还是没有，使用后备值
    if (!resolvedValue && fallback) {
      resolvedValue = fallback.trim();
    }
    
    // 如果解析后的值仍然包含 CSS 变量，递归解析
    if (resolvedValue && resolvedValue.includes('var(')) {
      return resolveCSSVariable(resolvedValue, element);
    }
    
    return resolvedValue || colorValue;
  } catch (e) {
    // 如果解析失败，返回原值
    return colorValue;
  }
}

// 提取并解析颜色值（处理 CSS 变量）
function extractAndResolveColor(colorValue, element) {
  if (!colorValue || colorValue === 'rgba(0, 0, 0, 0)' || colorValue === 'transparent') {
    return null;
  }
  
  // 解析 CSS 变量
  const resolvedColor = resolveCSSVariable(colorValue, element);
  
  // 转换为 HEX 格式
  if (resolvedColor && resolvedColor !== 'rgba(0, 0, 0, 0)' && resolvedColor !== 'transparent') {
    return rgbToHex(resolvedColor);
  }
  
  return null;
}

// 生成颜色的色阶
function generateColorScale(baseColor) {
  // 这里可以实现生成色阶的算法
  // 简单示例：生成亮度变化的色阶
  const scales = [];
  for (let i = 0; i <= 10; i++) {
    const factor = i / 10;
    scales.push(shadeColor(baseColor, factor * 200 - 100));
  }
  return scales;
}

// 调整颜色亮度
function shadeColor(color, percent) {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.min(255, Math.max(0, R + R * percent / 100));
  G = Math.min(255, Math.max(0, G + G * percent / 100));
  B = Math.min(255, Math.max(0, B + B * percent / 100));

  const RR = Math.round(R).toString(16).padStart(2, '0');
  const GG = Math.round(G).toString(16).padStart(2, '0');
  const BB = Math.round(B).toString(16).padStart(2, '0');

  return `#${RR}${GG}${BB}`;
}

// 发送颜色数据到侧边栏
function sendColorsToSidebar() {
  // 等待一段时间，确保动态内容加载完成
  setTimeout(() => {
    const colors = extractColors();
    chrome.runtime.sendMessage({
      action: "colorsExtracted",
      colors: colors
    });
  }, 1000); // 等待 1 秒让动态内容加载
}

// 过滤掉过于相似的颜色
function filterSimilarColors(colors) {
  const filtered = [];
  const threshold = 20; // 降低颜色差异阈值（从30降到20），保留更多细微差异
  
  for (const color of colors) {
    let isSimilar = false;
    
    for (const filteredColor of filtered) {
      if (colorDistance(color, filteredColor) < threshold) {
        // 如果颜色相似，保留权重更高的颜色
        const currentWeight = typeof color === 'object' ? color.weight : 0;
        const existingWeight = typeof filteredColor === 'object' ? filteredColor.weight : 0;
        
        if (currentWeight > existingWeight) {
          // 替换为权重更高的颜色
          const index = filtered.indexOf(filteredColor);
          filtered[index] = color;
        }
        
        isSimilar = true;
        break;
      }
    }
    
    if (!isSimilar) {
      filtered.push(color);
    }
  }
  
  // 按权重排序，返回前 15 个颜色（增加数量）
  return filtered
    .sort((a, b) => {
      const weightA = typeof a === 'object' ? a.weight : 0;
      const weightB = typeof b === 'object' ? b.weight : 0;
      return weightB - weightA;
    })
    .slice(0, 15);
}

// 计算两个颜色之间的差异
function colorDistance(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
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

// 页面加载完成后提取颜色
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', sendColorsToSidebar);
} else {
  sendColorsToSidebar();
}

// 监听 DOM 变化，处理动态加载的内容
const observer = new MutationObserver((mutations) => {
  let shouldUpdate = false;
  
  for (const mutation of mutations) {
    // 如果有节点被添加或删除，标记需要更新
    if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
      shouldUpdate = true;
      break;
    }
    
    // 如果 style 属性发生变化
    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
      shouldUpdate = true;
      break;
    }
  }
  
  // 防抖动：避免频繁更新
  if (shouldUpdate) {
    clearTimeout(window.__colorUpdateTimer);
    window.__colorUpdateTimer = setTimeout(() => {
      // 静默更新颜色数据，不发送消息
      const colors = extractColors();
      window.__extractedColors = colors;
    }, 2000); // 等待 2 秒后才更新
  }
});

// 开始监听 DOM 变化
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'class']
});

// 监听来自 popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractColors") {
    const colors = extractColors();
    sendResponse({colors: colors});
  } else if (request.action === "scanContrast") {
    const issues = scanPageContrastIssues();
    sendResponse({issues: issues});
  } else if (request.action === "highlightElement") {
    highlightElement(request.elementIndex);
    sendResponse({success: true});
  }
  return true; // 异步响应
});

// 扫描页面对比度问题
function scanPageContrastIssues() {
  const issues = [];
  const issueMap = new Map(); // 用于去重
  const threshold = 4.5; // WCAG AA 标准
  const elements = []; // 存储有问题的元素引用
  
  // 获取所有包含文本的元素
  const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, h5, h6, li, td, th, label, div');
  
  textElements.forEach((element, index) => {
    // 跳过不可见元素
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    const computedStyle = window.getComputedStyle(element);
    
    // 跳过隐藏元素
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
      return;
    }
    
    // 获取文本内容
    const text = element.textContent.trim();
    if (!text || text.length === 0) return;
    
    // 获取颜色
    const fgColor = computedStyle.color;
    const bgColor = getEffectiveBackgroundColor(element);
    
    if (!fgColor || !bgColor || bgColor === 'rgba(0, 0, 0, 0)') return;
    
    try {
      const fgHex = rgbToHex(fgColor);
      const bgHex = rgbToHex(bgColor);
      
      // 计算对比度
      const ratio = calculateContrastRatio(fgHex, bgHex);
      
      // 如果不符合 WCAG AA 标准
      if (ratio < threshold) {
        // 生成唯一键：颜色对 + 文本内容前50个字符
        const uniqueKey = `${fgHex}|${bgHex}|${text.substring(0, 50)}`;
        
        // 去重：只添加首次出现的问题
        if (!issueMap.has(uniqueKey) && issues.length < 20) {
          issueMap.set(uniqueKey, true);
          
          // 保存元素引用
          const elementIndex = elements.length;
          elements.push(element);
          
          issues.push({
            foreground: fgHex,
            background: bgHex,
            ratio: ratio,
            text: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
            selector: getElementSelector(element),
            elementIndex: elementIndex
          });
        }
      }
    } catch (e) {
      // 忽略错误
    }
  });
  
  // 存储元素引用到全局变量，供高亮显示使用
  window.__contrastIssueElements = elements;
  
  return issues;
}

// 获取元素的有效背景色（递归查找父元素）
function getEffectiveBackgroundColor(element) {
  let current = element;
  let bgColor = window.getComputedStyle(current).backgroundColor;
  
  // 向上查找直到找到不透明的背景色
  while (current && (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent')) {
    current = current.parentElement;
    if (current) {
      bgColor = window.getComputedStyle(current).backgroundColor;
    } else {
      bgColor = 'rgb(255, 255, 255)'; // 默认白色
      break;
    }
  }
  
  return bgColor;
}

// 获取元素的选择器
function getElementSelector(element) {
  if (element.id) return `#${element.id}`;
  if (element.className && typeof element.className === 'string') {
    const classes = element.className.split(' ').filter(c => c).slice(0, 2).join('.');
    if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
  }
  return element.tagName.toLowerCase();
}

// 计算对比度比值
function calculateContrastRatio(color1, color2) {
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

// 高亮显示元素
function highlightElement(elementIndex) {
  // 移除之前的高亮
  removeHighlight();
  
  const elements = window.__contrastIssueElements;
  if (!elements || !elements[elementIndex]) return;
  
  const element = elements[elementIndex];
  
  // 先滚动到元素位置
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  // 等待滚动完成后再显示高亮
  setTimeout(() => {
    // 获取滚动后的位置
    const rect = element.getBoundingClientRect();
    
    // 创建高亮遮罩
    const overlay = document.createElement('div');
    overlay.id = '__contrast-highlight-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999998;
      pointer-events: none;
      animation: fadeIn 0.3s ease;
    `;
    
    // 创建高亮边框
    const highlight = document.createElement('div');
    highlight.id = '__contrast-highlight-box';
    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top - 5}px;
      left: ${rect.left - 5}px;
      width: ${rect.width + 10}px;
      height: ${rect.height + 10}px;
      border: 3px solid #667eea;
      border-radius: 8px;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.3), 0 0 20px rgba(102, 126, 234, 0.5);
      animation: pulse 1.5s ease-in-out infinite;
    `;
    
    // 添加动画
    const style = document.createElement('style');
    style.id = '__contrast-highlight-style';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.02); opacity: 0.8; }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    
    // 3秒后自动移除高亮
    setTimeout(() => {
      removeHighlight();
    }, 3000);
  }, 500); // 等待 500ms 让滚动完成
}

// 移除高亮
function removeHighlight() {
  const overlay = document.getElementById('__contrast-highlight-overlay');
  const highlight = document.getElementById('__contrast-highlight-box');
  const style = document.getElementById('__contrast-highlight-style');
  
  if (overlay) overlay.remove();
  if (highlight) highlight.remove();
  if (style) style.remove();
}