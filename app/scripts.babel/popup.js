'use strict';

// Repository full_name array
let full_names = []

const ul = document.getElementById('Ul')


// DOMContentLoaded
document.addEventListener('DOMContentLoaded', (e) => {

  // ここで データを入れてしまう作戦
  chrome.storage.sync.get('full_names', (v) => {
    console.log('full_names');
    console.log(v.full_names);
    full_names = v.full_names

    // ここで初期表示
    const list = full_names
    ul.innerHTML = ''
    for (const [i, repo] of list.entries()) {
      appendLink(i, repo, ul)
    }
    addEventForClick()
  })

  // popup が開くたびに更新の戦略。
  chrome.storage.sync.get('token', (v) => {
    const token = v.token
    requestGithub(token).then((names)=>{
      setSearchInput(token)
      input.value = ''
      chrome.storage.sync.set({'full_names': names})

      // NOTE: この一行が token.js とことなる。
      full_names = names
      console.log('requestGithub が成功');
      console.log(full_names);
    }, () => {
      console.log('requestGithub が失敗');
    })
  })
})

////////////////////////////////////
// ここが一番重要で重い処理
// token セット時 storage に入れちゃう作戦
////////////////////////////////////
const requestGithub = (token) => {
  return new Promise((resolve, reject) => {
    let last_page = 1
    asyncGetRequestWithPage(token, 1)
      .then((xhr) => {
        const message = JSON.parse(xhr.responseText)['message']

        ////////////////////
        // token が正しくない場合！！！　これがやりたい
        if (typeof message !== undefined &&
            message === 'Bad credentials') {
          console.log(message);
          reject()
          return
        }
        ////////////////////


        const link = xhr.getResponseHeader('link')
        const last_page =  Number(link.replace(/^.*&page=(\d).*$/, '$1'))
        let promises = []
        let names = []
        for (let i=1; i<last_page+1; i++) {

          // It's not correct order...
          promises.push(asyncGetRequestWithPage(token, i).then((xhr) => {
            const ary = JSON.parse(xhr.responseText)
            for (const v of ary) {
              names.push(v.full_name)
            }
          }));
        } // end for
        Promise.all(promises).then(() => {
          full_names = names
          resolve(full_names)
        })
    })
  })
}

const asyncGetRequestWithPage = (token, page) => {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest()
    const url = 'https://api.github.com/user/repos?per_page=100'
                + '&page=' + String(page)
    xhr.open('GET', url)
    xhr.setRequestHeader('Authorization', 'token ' + token);
    xhr.onload = () => resolve(xhr)
    xhr.send()
  })
}


// Keyup
let keyup_stack = []
const keyword = document.getElementById('Search')
keyword.addEventListener('keyup', function(){

  // When click Enter key
  if (event.keyCode === 13) { // 知見
    const focus = document.getElementById('focus')
    document.getElementById('focus').click();

  // Down
  } else if (event.keyCode === 40) {
    const focus = document.getElementById('focus')
    if (!focus.nextElementSibling) { return }
    focus.id = ''
    focus.nextElementSibling.id = 'focus'

  // Up
  } else if (event.keyCode === 38) {
    const focus = document.getElementById('focus')
    if (!focus.previousElementSibling) { return }
    focus.id = ''
    focus.previousElementSibling.id = 'focus'

  // Other key
  } else {
    keyup_stack.push(1)
    setTimeout(function(){
      keyup_stack.pop()
      if (keyup_stack.length === 0) {
        searchRepositories(this.value)
      }
    }.bind(this), 250)
  }

})

const searchRepositories = (word) => {
  var buf = word.replace(/\//, '.*\/.*')
                .replace(/\s/, '.*')
                .replace(/(.*)/, '.*$1.*')
  var reg = new RegExp(buf);
  const list = full_names.filter((d) => {
    return reg.test(d)
  })
  ul.innerHTML = ''
  for (const [i, repo] of list.entries()) {
    appendLink(i, repo, ul)
  }
  addEventForClick()
}

const appendLink = (i, repo, ul) => {
  const li = document.createElement('li')
  li.innerText = repo
  li.dataset.repo = repo // 知見
  if (i === 0) {
    li.id = 'focus' // 知見
  }

  ul.appendChild(li)
}

const addEventForClick = () => {
  const repos = document.querySelectorAll('[data-repo]')
  Array.from(repos).forEach(repo => {
    repo.addEventListener('click', function(event) {
      // event.preventDefault();
      console.log(this.dataset.repo);
      const full_name = this.dataset.repo

      // NOTE: 新しいタブが開く
      chrome.tabs.create({ url: 'https://github.com/' + full_name + '/'})
    });
  });
}
