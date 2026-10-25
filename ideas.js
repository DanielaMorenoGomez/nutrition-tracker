// Meal options from the MV Nutrition plan: "swaps" are the plan's example menu
// (what one meal's servings can look like), "ideas" are ready-made meals that can be
// added in one tap. Idea items are [foodId from foods.js, quantity].

const LUNCH_DINNER = {
  swaps: [
    { group: 'veg', count: 2, text: '2 cups raw or cooked veggies · 1 cup beets, peas or squash · 4 tbsp tomato sauce' },
    { group: 'carb', count: 1, text: '½ cup rice, quinoa or pasta · ½ large potato or sweet potato · ½ cup beans or lentils · ⅓ cup yuca · ¼ plantain · 1 low carb tortilla' },
    { group: 'protein', count: 5, text: '5 oz fish, chicken, pork, beef or ground turkey · 7 oz tofu · 5 oz vegan meat' },
    { group: 'fat', count: 2, text: '2 tsp olive oil · ½ avocado · 2 oz cheese · 2 squares dark chocolate' },
  ],
  ideas: [
    { name: 'Quinoa, veggies, chicken + avocado', items: [['quinoa', 1], ['veg-low', 2], ['chicken', 5], ['avocado', 2]] },
    { name: 'Brown rice, side salad, fish + olive oil', items: [['brown-rice', 1], ['salad', 2], ['fish', 5], ['olive-oil', 2]] },
    { name: 'Salmon, sweet potato + broccoli', items: [['sweet-potato', 1], ['salmon', 5], ['veg-low', 2], ['olive-oil', 2]] },
    { name: 'Tuna wrap with hummus + veggies', items: [['ww-wrap', 1], ['tuna-can', 1], ['deli-turkey', 1], ['hummus', 2], ['veg-low', 2]] },
    { name: 'Bowl: brown rice, tuna, salad + olive oil', items: [['brown-rice', 1], ['tuna-can', 1], ['egg', 1], ['salad', 2], ['olive-oil', 2]] },
    { name: 'Chicken taco + guacamole + cheese', items: [['ww-wrap', 1], ['chicken', 5], ['salad', 2], ['avocado', 1], ['cheese', 1]] },
    { name: 'Ground turkey + rice + peas', items: [['brown-rice', 1], ['ground-turkey', 5], ['peas', 2], ['olive-oil', 2]] },
  ],
};

const MEAL_IDEAS = {
  breakfast: {
    swaps: [
      { group: 'carb', count: 2, text: '2 slices of bread · 1 cup cooked oatmeal · ½ cup granola · 2 cups fruit · 1 banana · 2 medium fruits' },
      { group: 'protein', count: 2, text: '5 oz Greek yogurt or cottage cheese · ⅔ scoop whey · 1.5 scoops vegan protein · 2 eggs' },
      { group: 'fat', count: 2, text: '1 tbsp peanut butter · ½ avocado · 2 tbsp cream cheese · 2 tsp butter' },
    ],
    ideas: [
      { name: 'Ezekiel toast, 2 eggs + butter spread', items: [['ezekiel', 2], ['egg', 2], ['icbinb', 1]] },
      { name: 'Avocado toast + 2 eggs', items: [['ww-bread', 2], ['avocado', 2], ['egg', 2]] },
      { name: 'Greek yogurt, granola + nut butter', items: [['greek-yogurt', 2], ['granola', 2], ['nut-butter', 1]] },
      { name: 'Protein oats + peanut butter', items: [['oatmeal', 2], ['whey', 1], ['nut-butter', 1]] },
      { name: 'Protein shake: banana + peanut butter', items: [['whey', 1], ['banana', 2], ['nut-butter', 1]] },
      { name: 'Turkey & cheese sandwich', items: [['ww-bread', 2], ['deli-turkey', 2], ['cheese', 2]] },
    ],
  },
  lunch: LUNCH_DINNER,
  snack: {
    swaps: [
      { group: 'carb', count: 1, text: '1 slice of bread · ¼ cup granola · 1 medium fruit · 1 cup chopped fruit' },
      { group: 'protein', count: 3, text: '7.5 oz Greek yogurt or cottage cheese · 1 scoop whey · 2 scoops vegan protein' },
    ],
    ideas: [
      { name: 'Greek yogurt + berries', items: [['greek-yogurt', 3], ['berries', 1]] },
      { name: 'Chobani protein yogurt + apple', items: [['chobani-protein', 1], ['apple', 1]] },
      { name: 'Protein shake + fruit', items: [['protein-shake', 1], ['orange', 1]] },
      { name: '3 eggs + rice cakes', items: [['egg', 3], ['rice-cake', 1]] },
      { name: '3 string cheese + fruit', items: [['string-cheese', 3], ['apple', 1]] },
      { name: 'David bar + berries', items: [['david-bar', 1], ['berries', 1]] },
    ],
  },
  dinner: LUNCH_DINNER,
};
