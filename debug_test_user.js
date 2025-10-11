// Script per debuggare nuovo utente di test
// Da eseguire nella console del browser

function debugTestUser(userId) {
    console.log('🧪 DEBUG TEST USER:', userId);
    console.log('==========================');
    
    // 1. Controlla stato utente
    console.log('📊 User State Checks:');
    console.log('- User ID:', userId);
    console.log('- Current Date:', new Date().toISOString());
    
    // 2. Trova elementi UI importanti
    const purchaseButton = document.querySelector('[data-testid="purchase-button"], button:contains("Acquista")');
    const subscriptionName = document.querySelector('[data-testid="subscription-name"]');
    const dialog = document.querySelector('[role="dialog"]');
    
    console.log('🎯 UI Elements:');
    console.log('- Purchase Button:', !!purchaseButton, purchaseButton);
    console.log('- Subscription Name:', subscriptionName?.textContent);
    console.log('- Dialog Open:', !!dialog);
    
    // 3. Controlla radio buttons se il dialog è aperto
    if (dialog) {
        const radioButtons = dialog.querySelectorAll('input[type="radio"]');
        console.log('🔘 Radio Buttons Found:', radioButtons.length);
        
        radioButtons.forEach((radio, index) => {
            console.log(`Radio ${index + 1}:`, {
                id: radio.id,
                value: radio.value,
                checked: radio.checked,
                disabled: radio.disabled,
                visible: radio.offsetParent !== null
            });
        });
    }
    
    // 4. Test click simulato
    if (purchaseButton && !dialog) {
        console.log('🖱️ Simulating purchase button click...');
        purchaseButton.click();
        
        setTimeout(() => {
            const newDialog = document.querySelector('[role="dialog"]');
            console.log('📋 Dialog opened after click:', !!newDialog);
            
            if (newDialog) {
                const newRadioButtons = newDialog.querySelectorAll('input[type="radio"]');
                console.log('🔘 Radio buttons in opened dialog:', newRadioButtons.length);
            }
        }, 500);
    }
}

// Funzione per testare radio buttons
function testRadioButtons() {
    console.log('🧪 TESTING RADIO BUTTONS');
    console.log('========================');
    
    const radioButtons = document.querySelectorAll('input[type="radio"][name="paymentMethod"]');
    console.log('Found radio buttons:', radioButtons.length);
    
    radioButtons.forEach((radio, index) => {
        console.log(`Testing radio ${index + 1} (${radio.value})...`);
        
        // Test click
        try {
            radio.click();
            console.log(`✅ Click successful on ${radio.value}, checked: ${radio.checked}`);
        } catch (error) {
            console.log(`❌ Click failed on ${radio.value}:`, error);
        }
        
        // Test change event
        try {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`✅ Change event successful on ${radio.value}`);
        } catch (error) {
            console.log(`❌ Change event failed on ${radio.value}:`, error);
        }
    });
}

console.log('🔧 Debug tools loaded!');
console.log('Usage:');
console.log('- debugTestUser("USER_ID") - Debug specific user');
console.log('- testRadioButtons() - Test radio button functionality');