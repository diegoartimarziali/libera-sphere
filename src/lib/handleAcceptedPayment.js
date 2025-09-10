"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAcceptedPayment = handleAcceptedPayment;
var createSubscriptionAward_1 = require("./createSubscriptionAward");
function handleAcceptedPayment(paymentData, userId) {
    return __awaiter(this, void 0, void 0, function () {
        var isMonthly, isSeasonal, awardsSnap, presenzeAward, toast;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[handleAcceptedPayment] paymentData:', paymentData, 'userId:', userId);
                    if (paymentData.type === 'subscription') {
                        isMonthly = paymentData.description.toLowerCase().includes('mensile');
                        isSeasonal = paymentData.description.toLowerCase().includes('stagionale');
                        console.log('[handleAcceptedPayment] isMonthly:', isMonthly, 'isSeasonal:', isSeasonal);
                        if (isMonthly || isSeasonal) {
                            // Crea il premio abbonamento
                            console.log('[handleAcceptedPayment] Creo premio abbonamento...');
                            await (0, createSubscriptionAward_1.createSubscriptionAward)({
                                userId: userId,
                                subscriptionType: isMonthly ? 'monthly' : 'seasonal',
                                subscriptionPrice: paymentData.amount + (paymentData.bonusUsed || 0)
                            });
                            console.log('[handleAcceptedPayment] Premio abbonamento creato. Cerco Premio Presenze in awards...');
                            // Cerca il premio "Premio Presenze" nella collezione awards
                            awardsSnap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, "awards"));
                            presenzeAward = awardsSnap.docs.find(function(doc) {
                                var data = doc.data();
                                return data.name === "Premio Presenze";
                            });
                            console.log('[handleAcceptedPayment] presenzeAward trovato:', !!presenzeAward, presenzeAward ? presenzeAward.data() : null);
                            if (presenzeAward) {
                                // Assegna il premio all'utente
                                console.log('[handleAcceptedPayment] Assegno Premio Presenze all\'utente...');
                                await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, "users", userId, "userAwards"), {
                                    awardId: presenzeAward.id,
                                    name: "Premio Presenze",
                                    value: presenzeAward.data().value,
                                    residuo: presenzeAward.data().value,
                                    usedValue: 0,
                                    used: false,
                                    assignedAt: firestore_1.Timestamp.now()
                                });
                                console.log('[handleAcceptedPayment] Premio Presenze assegnato!');
                                // Toast per l'utente
                                if (typeof window !== "undefined" && window.toast) {
                                    window.toast({
                                        variant: "success",
                                        title: "Premio Presenze assegnato!",
                                        description: "Hai ricevuto il premio Presenze, controlla i tuoi Premi."
                                    });
                                }
                            } else {
                                console.log('[handleAcceptedPayment] Premio Presenze NON trovato in awards!');
                                // Notifica l'admin che il premio non esiste
                                if (typeof window !== "undefined" && window.toast) {
                                    window.toast({
                                        variant: "destructive",
                                        title: "Premio Presenze non configurato",
                                        description: "Configura il premio 'Premio Presenze' in Gestione Premi per assegnarlo automaticamente."
                                    });
                                }
                                // Puoi aggiungere qui altre notifiche (push, log, ecc.)
                            }
                        }
                    }
                    return;
            }
        });
    });
}
