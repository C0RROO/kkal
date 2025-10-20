// Конфигурация Supabase
const SUPABASE_URL = "https://zsmsmpjqtpizotlsvzef.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbXNtcGpxdHBpem90bHN2emVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NTI0NDgsImV4cCI6MjA3NjIyODQ0OH0.lCcqVqn7gi0IueXzqx3IaIrW1qLq7Lm3jPucsywp2rk"

// Инициализация Supabase клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Локальная база продуктов для fallback
let products = [];
let recipeIngredients = [];

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    await loadProductsFromSupabase();
    setupEventListeners();
    await loadHistory();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск продуктов
    document.getElementById('searchProduct').addEventListener('input', function() {
        filterProducts(this.value);
    });

    // Показ/скрытие полей ручного ввода
    document.getElementById('productSelect').addEventListener('change', function() {
        document.getElementById('customProduct').style.display = 
            this.value === 'custom' ? 'block' : 'none';
    });

    document.getElementById('recipeProductSelect').addEventListener('change', function() {
        document.getElementById('customRecipeProduct').style.display = 
            this.value === 'custom' ? 'block' : 'none';
    });
}

// Загрузка продуктов из Supabase
async function loadProductsFromSupabase() {
    try {
        showNotification('Загрузка базы продуктов...', 'warning');
        
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');

        if (error) {
            console.error('Ошибка загрузки продуктов:', error);
            loadFallbackProducts();
            return;
        }

        if (data && data.length > 0) {
            products = data;
            showNotification(`Загружено ${data.length} продуктов`);
        } else {
            await loadInitialProducts();
        }

        populateProductSelects();
        displayProducts();
        
    } catch (error) {
        console.error('Ошибка:', error);
        loadFallbackProducts();
    }
}

// Загрузка начальных продуктов в базу
async function loadInitialProducts() {
    const initialProducts = [
        { name: "Куриная грудка", protein: 23.6, carbs: 0.4, fat: 1.9 },
        { name: "Гречка", protein: 12.6, carbs: 68.0, fat: 3.3 },
        { name: "Рис белый", protein: 6.7, carbs: 78.9, fat: 0.7 },
        { name: "Яблоко", protein: 0.4, carbs: 11.8, fat: 0.4 },
        { name: "Банан", protein: 1.5, carbs: 21.8, fat: 0.2 },
        { name: "Творог 5%", protein: 16.0, carbs: 3.0, fat: 5.0 },
        { name: "Яйцо куриное", protein: 12.7, carbs: 0.7, fat: 11.5 },
        { name: "Лосось", protein: 20.0, carbs: 0.0, fat: 13.0 },
        { name: "Брокколи", protein: 2.8, carbs: 6.6, fat: 0.4 },
        { name: "Молоко 2.5%", protein: 2.8, carbs: 4.7, fat: 2.5 }
    ];

    try {
        const { data, error } = await supabase
            .from('products')
            .insert(initialProducts)
            .select();

        if (error) throw error;
        
        products = data;
        showNotification('Начальные продукты загружены в базу');
        
    } catch (error) {
        console.error('Ошибка загрузки начальных данных:', error);
        products = initialProducts;
        populateProductSelects();
        displayProducts();
    }
}

// Fallback данные при ошибке подключения
function loadFallbackProducts() {
    products = [
        { name: "Куриная грудка", protein: 23.6, carbs: 0.4, fat: 1.9 },
        { name: "Гречка", protein: 12.6, carbs: 68.0, fat: 3.3 },
        { name: "Рис белый", protein: 6.7, carbs: 78.9, fat: 0.7 },
        { name: "Яблоко", protein: 0.4, carbs: 11.8, fat: 0.4 },
        { name: "Банан", protein: 1.5, carbs: 21.8, fat: 0.2 }
    ];
    showNotification('Используется локальная база данных', 'warning');
    populateProductSelects();
    displayProducts();
}

// Отображение продуктов в базе (новый формат)
function displayProducts(filteredProducts = null) {
    const list = document.getElementById('productsList');
    const productsToShow = filteredProducts || products;
    
    if (!list) {
        console.error('Элемент productsList не найден в DOM');
        return;
    }
    
    if (productsToShow.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Продукты не найдены</h3>
                <p>Попробуйте изменить поисковый запрос</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = '';
    
    productsToShow.forEach(product => {
        const calories = calculateCalories(product.protein, product.carbs, product.fat);
        
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <div class="product-main-info">
                <div class="product-name">${product.name}</div>
                <div class="product-calories">${calories} ккал</div>
            </div>
            <div class="product-macros-center">
                <div class="macros-line">
                    <span class="macro-item protein">Б: ${product.protein}g</span>
                    <span class="macro-item carbs">У: ${product.carbs}g</span>
                    <span class="macro-item fat">Ж: ${product.fat}g</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-icon btn-danger" onclick="deleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}')" title="Удалить продукт">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Удаление продукта
async function deleteProduct(productId, productName) {
    if (!confirm(`Вы уверены, что хотите удалить продукт "${productName}"?`)) {
        return;
    }

    try {
        console.log(`Пытаемся удалить продукт с ID: ${productId}`);
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) {
            console.error('Ошибка Supabase при удалении:', error);
            throw error;
        }

        console.log('Продукт успешно удален из базы данных');
        showNotification(`Продукт "${productName}" удален`);
        await loadProductsFromSupabase(); // Перезагружаем список продуктов
        
    } catch (error) {
        console.error('Ошибка удаления продукта:', error);
        showNotification('Ошибка удаления продукта', 'error');
    }
}

// Загрузка истории расчетов
async function loadHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Загрузка истории...</p></div>';

    try {
        const { data, error } = await supabase
            .from('calculation_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (data.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-history"></i>
                    <p>История расчетов пуста</p>
                    <p>Выполните расчеты, чтобы увидеть их здесь</p>
                </div>
            `;
            return;
        }

        displayHistory(data);
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Ошибка загрузки истории</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Отображение истории
function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    history.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = 'recipe-result-item';
        
        const date = new Date(item.timestamp).toLocaleString('ru-RU');
        
        let content = '';
        if (item.type === 'single') {
            content = `
                <div class="recipe-result-main">
                    <div class="recipe-result-title">${item.product}</div>
                    <div class="recipe-result-subtitle">Вес: ${item.weight}г | ${date}</div>
                    <div class="recipe-result-calories">${item.result.calories} ккал</div>
                </div>
                <div class="recipe-result-macros">
                    <div class="recipe-macros-line">
                        <div class="recipe-macro-item protein">
                            <div class="recipe-macro-value">${item.result.protein}g</div>
                            <div class="recipe-macro-label">Белки</div>
                        </div>
                        <div class="recipe-macro-item carbs">
                            <div class="recipe-macro-value">${item.result.carbs}g</div>
                            <div class="recipe-macro-label">Углеводы</div>
                        </div>
                        <div class="recipe-macro-item fat">
                            <div class="recipe-macro-value">${item.result.fat}g</div>
                            <div class="recipe-macro-label">Жиры</div>
                        </div>
                    </div>
                </div>
                <div class="recipe-result-actions">
                    <button class="btn-icon btn-danger" onclick="deleteHistoryItem(${item.id})" title="Удалить запись">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        } else if (item.type === 'recipe') {
            content = `
                <div class="recipe-result-main">
                    <div class="recipe-result-title">Сложное блюдо</div>
                    <div class="recipe-result-subtitle">Общий вес: ${item.total_weight}г | ${date}</div>
                    <div class="recipe-result-calories">${item.result.per100g.calories} ккал</div>
                </div>
                <div class="recipe-result-macros">
                    <div class="recipe-macros-line">
                        <div class="recipe-macro-item protein">
                            <div class="recipe-macro-value">${item.result.per100g.protein}g</div>
                            <div class="recipe-macro-label">Белки</div>
                        </div>
                        <div class="recipe-macro-item carbs">
                            <div class="recipe-macro-value">${item.result.per100g.carbs}g</div>
                            <div class="recipe-macro-label">Углеводы</div>
                        </div>
                        <div class="recipe-macro-item fat">
                            <div class="recipe-macro-value">${item.result.per100g.fat}g</div>
                            <div class="recipe-macro-label">Жиры</div>
                        </div>
                    </div>
                </div>
                <div class="recipe-result-actions">
                    <button class="btn-icon btn-danger" onclick="deleteHistoryItem(${item.id})" title="Удалить запись">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        
        historyItem.innerHTML = content;
        historyList.appendChild(historyItem);
    });
}


// Удаление записи истории
async function deleteHistoryItem(historyId) {
    if (!confirm('Вы уверены, что хотите удалить эту запись из истории?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('calculation_history')
            .delete()
            .eq('id', historyId);

        if (error) throw error;

        showNotification('Запись истории удалена');
        await loadHistory(); // Перезагружаем историю
        
    } catch (error) {
        console.error('Ошибка удаления записи истории:', error);
        showNotification('Ошибка удаления записи истории', 'error');
    }
}

// Очистка всей истории
async function clearHistory() {
    if (!confirm('Вы уверены, что хотите очистить всю историю расчетов?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('calculation_history')
            .delete()
            .neq('id', 0);

        if (error) throw error;

        showNotification('История очищена');
        await loadHistory();
        
    } catch (error) {
        console.error('Ошибка очистки истории:', error);
        showNotification('Ошибка очистки истории', 'error');
    }
}


// Функция для переключения вкладок
function openTab(tabName) {
    // Скрыть все вкладки
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }

    // Убрать активный класс со всех кнопок
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }

    // Показать выбранную вкладку
    document.getElementById(tabName).classList.add('active');
    
    // Найти и активировать соответствующую кнопку
    const activeTabs = document.getElementsByClassName('tab');
    for (let i = 0; i < activeTabs.length; i++) {
        if (activeTabs[i].getAttribute('onclick').includes(tabName)) {
            activeTabs[i].classList.add('active');
            break;
        }
    }

    // Если открыли вкладку истории - обновляем ее
    if (tabName === 'history') {
        loadHistory();
    }
}


// Заполнение выпадающих списков продуктами
function populateProductSelects() {
    const singleSelect = document.getElementById('productSelect');
    const recipeSelect = document.getElementById('recipeProductSelect');
    
    // Очистка кроме первого option
    while (singleSelect.children.length > 2) singleSelect.removeChild(singleSelect.lastChild);
    while (recipeSelect.children.length > 2) recipeSelect.removeChild(recipeSelect.lastChild);
    
    products.forEach(product => {
        const option1 = document.createElement('option');
        option1.value = product.name;
        option1.textContent = product.name;
        singleSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = product.name;
        option2.textContent = product.name;
        recipeSelect.appendChild(option2);
    });
}

// Отображение продуктов в базе
function displayProducts(filteredProducts = null) {
    const grid = document.getElementById('productsList');
    const productsToShow = filteredProducts || products;
    
    if (productsToShow.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>Продукты не найдены</h3>
                <p>Попробуйте изменить поисковый запрос</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = '';
    
    productsToShow.forEach(product => {
        const calories = calculateCalories(product.protein, product.carbs, product.fat);
        
        const item = document.createElement('div');
        item.className = 'product-item';
        item.innerHTML = `
            <div class="product-main-info">
                <div class="product-name">${product.name}</div>
                <div class="product-calories">${calories} ккал</div>
            </div>
            <div class="product-macros-center">
                <div class="macros-line">
                    <span class="macro-item protein">Б: ${product.protein}g</span>
                    <span class="macro-item carbs">У: ${product.carbs}g</span>
                    <span class="macro-item fat">Ж: ${product.fat}g</span>
                </div>
            </div>
            <div class="product-actions">
                <button class="btn-icon btn-danger" onclick="deleteProduct(${product.id}, '${product.name.replace(/'/g, "\\'")}')" title="Удалить продукт">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        grid.appendChild(item);
    });
}

// Фильтрация продуктов
function filterProducts(query) {
    if (!query) {
        displayProducts();
        return;
    }
    
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase())
    );
    
    displayProducts(filteredProducts);
}

// Расчет калорий по формуле
function calculateCalories(protein, carbs, fat) {
    return (protein * 4 + carbs * 4 + fat * 9).toFixed(1);
}

// Расчет для отдельного продукта
async function calculateSingle() {
    const productSelect = document.getElementById('productSelect');
    const weight = parseFloat(document.getElementById('weight').value) || 100;
    
    let product;
    
    if (productSelect.value === 'custom') {
        // Пользовательский ввод
        const protein = parseFloat(document.getElementById('protein').value) || 0;
        const carbs = parseFloat(document.getElementById('carbs').value) || 0;
        const fat = parseFloat(document.getElementById('fat').value) || 0;
        const name = document.getElementById('productName').value || 'Продукт';
        
        product = { name, protein, carbs, fat };
    } else {
        // Выбор из базы
        const selectedProduct = products.find(p => p.name === productSelect.value);
        if (!selectedProduct) {
            showNotification('Пожалуйста, выберите продукт', 'error');
            return;
        }
        product = selectedProduct;
    }
    
    // Расчет
    const proteinTotal = (product.protein * weight / 100).toFixed(1);
    const carbsTotal = (product.carbs * weight / 100).toFixed(1);
    const fatTotal = (product.fat * weight / 100).toFixed(1);
    const caloriesTotal = calculateCalories(proteinTotal, carbsTotal, fatTotal);
    
    // Расчет на 100г для сравнения
    const caloriesPer100g = calculateCalories(product.protein, product.carbs, product.fat);
    
    // Сохранение в историю
    await saveToHistory({
        type: 'single',
        product: product.name,
        weight: weight,
        result: {
            protein: proteinTotal,
            carbs: carbsTotal,
            fat: fatTotal,
            calories: caloriesTotal
        },
        timestamp: new Date().toISOString()
    });
    
    // Отображение результата в новом формате
    const resultDiv = document.getElementById('singleResultContent');
    resultDiv.innerHTML = `
        <div class="recipe-result-item">
            <div class="recipe-result-main">
                <div class="recipe-result-title">${product.name}</div>
                <div class="recipe-result-subtitle">Вес: ${weight}г</div>
                <div class="recipe-result-calories">${caloriesTotal} ккал</div>
            </div>
            <div class="recipe-result-macros">
                <div class="recipe-macros-line">
                    <div class="recipe-macro-item protein">
                        <div class="recipe-macro-value">${proteinTotal}g</div>
                        <div class="recipe-macro-label">Белки</div>
                    </div>
                    <div class="recipe-macro-item carbs">
                        <div class="recipe-macro-value">${carbsTotal}g</div>
                        <div class="recipe-macro-label">Углеводы</div>
                    </div>
                    <div class="recipe-macro-item fat">
                        <div class="recipe-macro-value">${fatTotal}g</div>
                        <div class="recipe-macro-label">Жиры</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="recipe-result-item">
            <div class="recipe-result-main">
                <div class="recipe-result-title">${product.name}</div>
                <div class="recipe-result-subtitle">Стандартная порция: 100г</div>
                <div class="recipe-result-calories">${caloriesPer100g} ккал</div>
            </div>
            <div class="recipe-result-macros">
                <div class="recipe-macros-line">
                    <div class="recipe-macro-item protein">
                        <div class="recipe-macro-value">${product.protein}g</div>
                        <div class="recipe-macro-label">Белки</div>
                    </div>
                    <div class="recipe-macro-item carbs">
                        <div class="recipe-macro-value">${product.carbs}g</div>
                        <div class="recipe-macro-label">Углеводы</div>
                    </div>
                    <div class="recipe-macro-item fat">
                        <div class="recipe-macro-value">${product.fat}g</div>
                        <div class="recipe-macro-label">Жиры</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('singleResult').classList.add('active');
}

// Добавление ингредиента в рецепт
function addIngredient() {
    const productSelect = document.getElementById('recipeProductSelect');
    const weight = parseFloat(document.getElementById('recipeWeight').value);
    
    if (!weight || weight <= 0) {
        showNotification('Пожалуйста, введите вес продукта', 'error');
        return;
    }
    
    let product;
    
    if (productSelect.value === 'custom') {
        const protein = parseFloat(document.getElementById('customRecipeProtein').value) || 0;
        const carbs = parseFloat(document.getElementById('customRecipeCarbs').value) || 0;
        const fat = parseFloat(document.getElementById('customRecipeFat').value) || 0;
        const name = document.getElementById('customRecipeName').value || 'Ингредиент';
        
        if (!name) {
            showNotification('Пожалуйста, введите название продукта', 'error');
            return;
        }
        
        product = { name, protein, carbs, fat };
    } else {
        const selectedProduct = products.find(p => p.name === productSelect.value);
        if (!selectedProduct) {
            showNotification('Пожалуйста, выберите продукт', 'error');
            return;
        }
        product = selectedProduct;
    }
    
    recipeIngredients.push({
        ...product,
        weight: weight
    });
    
    updateIngredientsList();
    
    // Сброс полей
    document.getElementById('recipeWeight').value = '';
    document.getElementById('customRecipeProduct').style.display = 'none';
    productSelect.value = '';
    
    showNotification('Ингредиент добавлен');
}

// Обновление списка ингредиентов
function updateIngredientsList() {
    const list = document.getElementById('ingredientsList');
    list.innerHTML = '';
    
    if (recipeIngredients.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>Добавьте ингредиенты для расчета</p>
            </div>
        `;
        return;
    }
    
    recipeIngredients.forEach((ingredient, index) => {
        const calories = calculateCalories(ingredient.protein, ingredient.carbs, ingredient.fat);
        
        const item = document.createElement('div');
        item.className = 'ingredient-item';
        item.innerHTML = `
            <div class="ingredient-info">
                <div><strong>${ingredient.name}</strong></div>
                <div>${ingredient.weight}г</div>
                <div>Б: ${ingredient.protein}g</div>
                <div>У: ${ingredient.carbs}g</div>
                <div>Ж: ${ingredient.fat}g</div>
                <div>${calories} ккал</div>
            </div>
            <div class="ingredient-actions">
                <button class="btn-icon" onclick="removeIngredient(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

// Удаление ингредиента
function removeIngredient(index) {
    recipeIngredients.splice(index, 1);
    updateIngredientsList();
    showNotification('Ингредиент удален');
}

// Расчет для сложного блюда
async function calculateRecipe() {
    if (recipeIngredients.length === 0) {
        showNotification('Добавьте хотя бы один ингредиент', 'error');
        return;
    }
    
    const totalDishWeight = parseFloat(document.getElementById('totalDishWeight').value);
    if (!totalDishWeight || totalDishWeight <= 0) {
        showNotification('Пожалуйста, введите общий вес готового блюда', 'error');
        return;
    }
    
    // Расчет суммарных значений
    let totalProtein = 0, totalCarbs = 0, totalFat = 0, totalCalories = 0;
    
    recipeIngredients.forEach(ingredient => {
        const protein = ingredient.protein * ingredient.weight / 100;
        const carbs = ingredient.carbs * ingredient.weight / 100;
        const fat = ingredient.fat * ingredient.weight / 100;
        
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;
        totalCalories += protein * 4 + carbs * 4 + fat * 9;
    });
    
    // Расчет на 100г готового блюда
    const proteinPer100g = (totalProtein / totalDishWeight * 100).toFixed(1);
    const carbsPer100g = (totalCarbs / totalDishWeight * 100).toFixed(1);
    const fatPer100g = (totalFat / totalDishWeight * 100).toFixed(1);
    const caloriesPer100g = (totalCalories / totalDishWeight * 100).toFixed(1);
    
    // Сохранение в историю
    await saveToHistory({
        type: 'recipe',
        ingredients: recipeIngredients,
        total_weight: totalDishWeight,   // меняем на snake_case
        result: {
            total: {
                protein: totalProtein.toFixed(1),
                carbs: totalCarbs.toFixed(1),
                fat: totalFat.toFixed(1),
                calories: totalCalories.toFixed(1)
            },
            per100g: {
                protein: proteinPer100g,
                carbs: carbsPer100g,
                fat: fatPer100g,
                calories: caloriesPer100g
            }
        },
        timestamp: new Date().toISOString()
    });
    
    // Отображение результата в новом формате
    const resultDiv = document.getElementById('recipeResultContent');
    resultDiv.innerHTML = `
        <div class="recipe-result-item">
            <div class="recipe-result-main">
                <div class="recipe-result-title">Общее блюдо</div>
                <div class="recipe-result-subtitle">Вес: ${totalDishWeight}г</div>
                <div class="recipe-result-calories">${totalCalories.toFixed(1)} ккал</div>
            </div>
            <div class="recipe-result-macros">
                <div class="recipe-macros-line">
                    <div class="recipe-macro-item protein">
                        <div class="recipe-macro-value">${totalProtein.toFixed(1)}g</div>
                        <div class="recipe-macro-label">Белки</div>
                    </div>
                    <div class="recipe-macro-item carbs">
                        <div class="recipe-macro-value">${totalCarbs.toFixed(1)}g</div>
                        <div class="recipe-macro-label">Углеводы</div>
                    </div>
                    <div class="recipe-macro-item fat">
                        <div class="recipe-macro-value">${totalFat.toFixed(1)}g</div>
                        <div class="recipe-macro-label">Жиры</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="recipe-result-item">
            <div class="recipe-result-main">
                <div class="recipe-result-title">На 100 грамм</div>
                <div class="recipe-result-subtitle">Стандартная порция</div>
                <div class="recipe-result-calories">${caloriesPer100g} ккал</div>
            </div>
            <div class="recipe-result-macros">
                <div class="recipe-macros-line">
                    <div class="recipe-macro-item protein">
                        <div class="recipe-macro-value">${proteinPer100g}g</div>
                        <div class="recipe-macro-label">Белки</div>
                    </div>
                    <div class="recipe-macro-item carbs">
                        <div class="recipe-macro-value">${carbsPer100g}g</div>
                        <div class="recipe-macro-label">Углеводы</div>
                    </div>
                    <div class="recipe-macro-item fat">
                        <div class="recipe-macro-value">${fatPer100g}g</div>
                        <div class="recipe-macro-label">Жиры</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('recipeResult').classList.add('active');
}

// Добавление продукта в базу
async function addToDatabase() {
    const name = document.getElementById('newProductName').value;
    const protein = parseFloat(document.getElementById('newProductProtein').value) || 0;
    const carbs = parseFloat(document.getElementById('newProductCarbs').value) || 0;
    const fat = parseFloat(document.getElementById('newProductFat').value) || 0;
    
    if (!name) {
        showNotification('Пожалуйста, введите название продукта', 'error');
        return;
    }
    
    // Проверка на дубликат
    if (products.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Этот продукт уже есть в базе', 'error');
        return;
    }
    
    const newProduct = { name, protein, carbs, fat };
    
    try {
        // Сохраняем в Supabase
        const { data, error } = await supabase
            .from('products')
            .insert([newProduct])
            .select();
        
        if (error) {
            throw error;
        }
        
        // Обновляем локальный массив
        products.push(data[0]);
        
        // Обновление интерфейса
        populateProductSelects();
        displayProducts();
        
        // Очистка полей
        document.getElementById('newProductName').value = '';
        document.getElementById('newProductProtein').value = '';
        document.getElementById('newProductCarbs').value = '';
        document.getElementById('newProductFat').value = '';
        
        showNotification('Продукт успешно добавлен в базу!');
        
    } catch (error) {
        console.error('Ошибка сохранения в базу:', error);
        // Fallback: сохраняем локально
        products.push(newProduct);
        populateProductSelects();
        displayProducts();
        showNotification('Продукт добавлен локально', 'warning');
    }
}

// Сохранение расчета в историю
async function saveToHistory(calculationData) {
    try {
        const { error } = await supabase
            .from('calculation_history')
            .insert([calculationData]);
        
        if (error) {
            console.error('Ошибка сохранения истории:', error);
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Показать уведомление
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    
    // Установка цвета в зависимости от типа
    if (type === 'error') {
        notification.style.background = 'var(--error)';
    } else if (type === 'warning') {
        notification.style.background = 'var(--warning)';
    } else {
        notification.style.background = 'var(--success)';
    }
    
    notification.classList.add('active');
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}
