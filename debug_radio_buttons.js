// Script per testare Radio Buttons nel Dialog di Pagamento
// Da eseguire nella console dopo aver aperto il dialog

console.log('🔍 TESTING RADIO BUTTONS FUNCTIONALITY');
console.log('=======================================');

// 1. Trova tutti i radio buttons
const radioButtons = document.querySelectorAll('input[type="radio"][name="paymentMethod"]');
console.log(`📊 Found ${radioButtons.length} radio buttons`);

radioButtons.forEach((radio, index) => {
    console.log(`🔘 Radio ${index + 1}:`, {
        id: radio.id,
        value: radio.value,
        checked: radio.checked,
        disabled: radio.disabled,
        style: {
            pointerEvents: window.getComputedStyle(radio).pointerEvents,
            zIndex: window.getComputedStyle(radio).zIndex,
            position: window.getComputedStyle(radio).position,
            display: window.getComputedStyle(radio).display
        }
    });
});

// 2. Testa i parent elements
console.log('\n🔍 TESTING PARENT ELEMENTS:');
radioButtons.forEach((radio, index) => {
    const label = radio.closest('label');
    const labelStyle = label ? window.getComputedStyle(label) : null;
    
    console.log(`📦 Radio ${index + 1} Parent Label:`, {
        exists: !!label,
        pointerEvents: labelStyle?.pointerEvents,
        zIndex: labelStyle?.zIndex,
        cursor: labelStyle?.cursor
    });
});

// 3. Simula click programmatico
console.log('\n🖱️ TESTING PROGRAMMATIC CLICKS:');
radioButtons.forEach((radio, index) => {
    console.log(`Attempting click on radio ${index + 1} (${radio.value})...`);
    
    try {
        // Test click diretto
        radio.click();
        console.log(`✅ Direct click successful on ${radio.value}, checked: ${radio.checked}`);
    } catch (error) {
        console.log(`❌ Direct click failed on ${radio.value}:`, error);
    }
    
    try {
        // Test change event
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`✅ Change event successful on ${radio.value}, checked: ${radio.checked}`);
    } catch (error) {
        console.log(`❌ Change event failed on ${radio.value}:`, error);
    }
});

// 4. Test event listeners
console.log('\n🎯 TESTING EVENT LISTENERS:');
radioButtons.forEach((radio, index) => {
    console.log(`Adding test listener to radio ${index + 1}...`);
    
    radio.addEventListener('click', (e) => {
        console.log(`🎉 CLICK DETECTED on ${radio.value}!`);
    });
    
    radio.addEventListener('change', (e) => {
        console.log(`🔄 CHANGE DETECTED on ${radio.value}!`);
    });
});

// 5. Test Label clicks
console.log('\n🏷️ TESTING LABEL CLICKS:');
radioButtons.forEach((radio, index) => {
    const label = radio.closest('label');
    if (label) {
        console.log(`Attempting label click for radio ${index + 1}...`);
        try {
            label.click();
            console.log(`✅ Label click successful for ${radio.value}, checked: ${radio.checked}`);
        } catch (error) {
            console.log(`❌ Label click failed for ${radio.value}:`, error);
        }
    }
});

console.log('\n✨ Test completato! Apri il dialog e riprova questo script.');