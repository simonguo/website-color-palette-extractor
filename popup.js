// 查看配色结果按钮事件
document.getElementById('openResults').addEventListener('click', () => {
  // 打开新的标签页显示配色结果
  chrome.tabs.create({url: chrome.runtime.getURL('sidebar.html')});
  
  // 关闭弹出窗口
  window.close();
});

// 提取配色按钮事件
document.getElementById('extractColors').addEventListener('click', () => {
  // 获取当前活动标签页
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      // 在当前标签页执行内容脚本
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        files: ['content.js']
      }, () => {
        // 显示成功消息
        showStatus('配色提取完成！请查看侧边栏。', 'success');
      });
    }
  });
});

// 显示状态消息
function showStatus(message, type) {
  // 移除现有的状态消息
  const existingStatus = document.querySelector('.status-message');
  if (existingStatus) {
    existingStatus.remove();
  }
  
  // 创建新的状态消息
  const status = document.createElement('div');
  status.className = `status-message ${type}`;
  status.textContent = message;
  status.style.cssText = `
    padding: 10px;
    border-radius: 4px;
    margin-top: 10px;
    text-align: center;
    ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
    ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
  `;
  
  // 插入到页面中
  document.body.insertBefore(status, document.querySelector('.footer'));
  
  // 3秒后移除
  setTimeout(() => {
    status.remove();
  }, 3000);
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', () => {
  // Chrome浏览器兼容性处理
  console.log('Popup loaded');
});