/* jshint curly:true, debug:true */
/* globals $, firebase, location, moment */
// Your web app's Firebase configuration
// Initialize Firebase
firebase.initializeApp({
  apiKey: "*************",
  authDomain: "*************",
  databaseURL: "*************",
  projectId: "*************",
  storageBucket: "*************",
  messagingSenderId: "*************",
  appId: "*************"
});

var sectionsRef = firebase.database().ref('sections');

new Vue({
  el: '#app',
  data: {
    selectedSectionId: null,
    selectedItemId: null,
    beforeEditCache: '',
    beforeEditCacheItem: '',
    sections: [],
    items: [],
    selectedTodoStatus: 0,
    todoStatusList: [
      { name: '全て表示' },
      { name: '完了のみ表示' },
      { name: '未完了のみ表示' }
    ],
    editList: [
      { name: '名前の変更' },
      { name: '削除' }
    ],
  },

  directives: {
    focus: {
      inserted: function (el) {
        el.focus();
      }
    }
  },

  created() {
    var self = this;

    // セクションを検索
    sectionsRef.on('child_added', function (sectionData) {
      self.sections.push({
        id: sectionData.key,
        name: sectionData.val().name,
        editing: false,
      });

      // Todo項目を検索
      firebase.database().ref('items/' + sectionData.key).on('child_added', function (itemData) {
        var result = self.items.find(function (i) {
          return i.sectionId === sectionData.key;
        });
        if (result == null) {
          self.items.push({
            sectionId: sectionData.key,
            items: [{
              id: itemData.key,
              name: itemData.val().name,
              editing: false,
              isComplete: itemData.val().isComplete,
            }]
          });
          return;
        }
        result.items.push({ id: itemData.key, name: itemData.val().name, editing: false, isComplete: itemData.val().isComplete });
      });

      firebase.database().ref('items/' + sectionData.key).on('child_removed', function (data) {
        var result = self.items.find(function (i) {
          return i.sectionId === sectionData.key;
        });
        result.items = result.items.filter(function (i) {
          return i.id !== data.key;
        });
      });

    });

    sectionsRef.on('child_removed', function (data) {
      self.sections = self.sections.filter(function (s) {
        return s.id !== data.key;
      });
    });
  },

  computed: {
    // 選択したセクションのTodo項目を取得
    currentItems() {
      if (this.selectedSectionId == null) {
        return [];
      }

      var self = this;

      var result = this.items.find(function (i) {
        return i.sectionId === self.selectedSectionId;
      });
      if (result == null) {
        return [];
      }

      var filterResult = []
      if (this.selectedTodoStatus === 1) {
        filterResult = result.items.filter(i => i.isComplete === true)
        return filterResult
      } else if (this.selectedTodoStatus === 2) {
        filterResult = result.items.filter(i => i.isComplete === false)
        return filterResult
      } else {
        return result.items;
      }
    },
  },

  methods: {
    // セクション追加
    addSection: function () {
      var inputSectionName = window.prompt('追加するセクション名を入力してください');
      if (inputSectionName === '') {
        return;
      }
      sectionsRef.push({
        name: inputSectionName,
      });
    },

    selectSection: function (id) {
      this.selectedSectionId = id;
    },

    selectItem: function (id) {
      this.selectedItemId = id;
    },

    // Todo項目追加
    addItem: function () {
      var inputItemName = window.prompt('追加するTodo項目を入力してください');
      if (inputItemName === '') {
        return;
      }
      firebase.database().ref('items/' + this.selectedSectionId).push({
        name: inputItemName,
        isComplete: false,
      });
    },

    // セクション削除
    removeSection: function (key) {
      if (window.confirm("本当に削除しますか？")) {
        firebase.database().ref('sections/' + key).remove();
        var sectionidInItems = firebase.database().ref('items/' + key);
        if (sectionidInItems === null) {
          return;
        }
        sectionidInItems.remove();
      }
      return
    },

    // Todo項目削除
    removeItem: function (key) {
      firebase.database().ref('items/' + this.selectedSectionId + '/' + key).remove();
    },

    // 名前の編集
    editName(name) {
      this.beforeEditCache = name.name;
      name.editing = true;
    },

    // セクション名の更新
    doneEditSection(name) {
      if (name.name == '') {
        name.name = this.beforeEditCache;
      }
      firebase.database().ref('sections/' + this.selectedSectionId).update({
        name: name.name
      });
      name.editing = false;
    },

    cancelEditSection(name) {
      name.name = this.beforeEditCache;
      name.editing = false;
    },

    // Todo項目名の更新
    doneEditItem(name) {
      if (name.name == '') {
        name.name = this.beforeEditCacheItem;
      }
      firebase.database().ref('items/' + this.selectedSectionId + '/' + this.selectedItemId).update({
        name: name.name
      });
      name.editing = false;
    },

    cancelEditItem(name) {
      name.name = this.beforeEditCacheItem;
      name.editing = false;
    },

    // Todo完了・未完了を更新
    updateTodoStatus(item) {
      item.isComplete = !item.isComplete
      firebase.database().ref('items/' + this.selectedSectionId + '/' + this.selectedItemId).update({
        isComplete: item.isComplete
      });
    },

    // セクションの編集ボタンを押下した時の処理
    editSection(index, s) {
      if (index === 0) {
        this.editName(s)
      }
      else if (index === 1) {
        this.removeSection(s.id)
      }
    },

    // Todo項目の編集ボタンを押下した時の処理
    editItem(index, item) {
      if (index === 0) {
        this.editName(item)
      }
      else if (index === 1) {
        this.removeItem(item.id)
      }
    }
  }
});
