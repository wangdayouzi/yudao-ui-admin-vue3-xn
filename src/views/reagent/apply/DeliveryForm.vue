<template>
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="1400px"
    :close-on-click-modal="false"
    top="3vh"
  >
    <el-form ref="formRef" v-loading="formLoading" :model="formData" :rules="formRules" label-width="110px">
      <!-- 退回理由提示 -->
      <el-alert v-if="formData.status === 4 && formData.remark" :title="'退回理由：' + formData.remark" type="error" :closable="false" style="margin-bottom: 12px" />

      <!-- ==================== 基础数据信息维护 ==================== -->
        <el-divider content-position="left">基础数据信息维护</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="运费结算方式" prop="freightSettlement">
              <el-select v-model="formData.freightSettlement" placeholder="请选择" :disabled="isReadonly">
                <el-option label="客户（客户预约物流）" value="客户（客户预约物流）" />
                <el-option label="我司（后续据实结算）" value="我司（后续据实结算）" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="项目号" prop="projectNo" :rules="formData.freightSettlement === '我司（后续据实结算）' ? [{ required: true, message: '我司结算时项目号必填', trigger: 'blur' }] : []">
              <el-input v-model="formData.projectNo" placeholder="请输入项目号" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="运输温度" prop="transportTemp">
              <el-input v-model="formData.transportTemp" placeholder="如：2-8°C" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="温度记录仪">
              <el-switch v-model="formData.hasTempLogger" :active-value="1" :inactive-value="0" active-text="是" inactive-text="否" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="计划运出日期" prop="plannedShipDate">
              <el-date-picker
                v-if="!isReadonly"
                v-model="formData.plannedShipDate"
                type="date"
                value-format="x"
                placeholder="选择计划运出日期"
                style="width: 100%"
              />
              <span v-else>{{ formData.plannedShipDate ? formatDate(formData.plannedShipDate) : '-' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="备注" prop="note">
              <el-input v-model="formData.note" placeholder="备注（选填）" :disabled="isReadonly" />
            </el-form-item>
          </el-col>
        </el-row>

      <!-- ==================== 试剂明细区块 ==================== -->
      <el-divider content-position="left">试剂明细</el-divider>
      <el-button
        v-if="!isReadonly"
        type="primary"
        size="small"
        style="margin-bottom: 8px"
        @click="addItem"
      >
        <Icon icon="ep:plus" />添加试剂
      </el-button>
      <el-table :data="formData.items" border size="small">
        <el-table-column v-if="!isReadonly" label="选择" width="76" fixed="left">
          <template #default="scope">
            <el-button link type="primary" size="small" @click="openFlatPicker(scope.$index)">
              <Icon icon="ep:search" />选择
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="试剂名称" min-width="180">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.reagentName" size="small" placeholder="试剂名称" />
            <span v-else>{{ scope.row.reagentName || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="BAS号" min-width="130">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.basNo" size="small" placeholder="BAS/入库单号" />
            <span v-else>{{ scope.row.basNo || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="需求数量" width="110">
          <template #default="scope">
            <el-input-number
              v-if="!isReadonly"
              v-model="scope.row.requestedQty"
              :min="1"
              size="small"
              controls-position="right"
              style="width: 100%"
            />
            <span v-else>{{ scope.row.requestedQty }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="mode === 'ship'" label="本次发货" width="110">
          <template #default="scope">
            <el-input-number
              v-model="scope.row._shipQty"
              :min="0"
              :max="(scope.row.requestedQty || 0) - (scope.row.shippedQtyTotal || 0)"
              size="small"
              controls-position="right"
              style="width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column label="供应商" min-width="130">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.vendor" size="small" placeholder="供应商" />
            <span v-else>{{ scope.row.vendor || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="品牌" min-width="130">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.brand" size="small" placeholder="品牌" />
            <span v-else>{{ scope.row.brand || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="试剂编号" min-width="120">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.basId" size="small" placeholder="试剂编号" />
            <span v-else>{{ scope.row.basId || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="货号" min-width="110">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.catNo" size="small" placeholder="货号" />
            <span v-else>{{ scope.row.catNo || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="规格/浓度" min-width="110">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.content" size="small" placeholder="规格/浓度" />
            <span v-else>{{ scope.row.content || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="批号" min-width="120">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.lotNo" size="small" placeholder="批号" />
            <span v-else>{{ scope.row.lotNo || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="储存温度" min-width="220">
          <template #default="scope">
            <el-select
              v-if="!isReadonly"
              v-model="scope.row.storageTempArr"
              placeholder="储存温度（可多选）"
              clearable
              multiple
              filterable
              allow-create
              default-first-option
              size="small"
              style="width: 100%"
            >
              <el-option
                v-for="dict in getStrDictOptions(DICT_TYPE.REAGENT_STORAGE_CONDITION)"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
            <span v-else>{{ scope.row.storageTemp || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="储存位置" min-width="130">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row.storageLocation" size="small" placeholder="储存位置" />
            <span v-else>{{ scope.row.storageLocation || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="过期日期" width="150">
          <template #default="scope">
            <el-date-picker
              v-if="!isReadonly"
              v-model="scope.row.expirationDate"
              type="date"
              value-format="x"
              size="small"
              placeholder="过期日期"
              style="width: 100%"
            />
            <span v-else-if="scope.row.expirationDate">{{ formatDate(scope.row.expirationDate) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column v-if="mode === 'ship'" label="已发数量" width="80">
          <template #default="scope">
            {{ scope.row.shippedQtyTotal || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="120">
          <template #default="scope">
            <el-input v-if="!isReadonly" v-model="scope.row._remark" size="small" placeholder="选填" />
            <span v-else>{{ scope.row._remark || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column v-if="!isReadonly" label="操作" width="70">
          <template #default="scope">
            <el-button link type="danger" size="small" @click="removeItem(scope.$index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- ==================== 物流信息区块（仅样品组处理时显示） ==================== -->
      <template v-if="mode === 'ship'">
        <el-divider content-position="left">物流信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="快递单号" prop="trackingNumber">
              <el-input v-model="logisticsForm.trackingNumber" placeholder="请输入快递单号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="物流公司" prop="expressCompany">
              <el-select
                v-model="logisticsForm.expressCompany"
                placeholder="请选择或输入物流公司"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option v-for="item in expressCompanyOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <!-- ==================== 发货记录展示 ==================== -->
      <template v-if="mode === 'ship' || mode === 'view'">
        <el-divider content-position="left">
          发货记录
          <el-button v-if="mode === 'ship'" type="primary" size="small" link @click="loadShipmentHistory">
            <Icon icon="ep:refresh" />刷新
          </el-button>
        </el-divider>
        <div v-if="shipmentHistory.length > 0" style="margin-bottom: 8px">
          <el-button type="success" size="small" :disabled="selectedShipments.length === 0" @click="handlePrintSelected">
            <Icon icon="ep:printer" />打印选中 ({{ selectedShipments.length }})
          </el-button>
        </div>
        <el-table
          v-if="mode === 'ship'"
          ref="shipmentTableRef" style="width: 100%"
          :data="shipmentHistory"
          border
          size="small"
          empty-text="暂无发货记录"
          @expand-change="onShipmentExpand"
          @selection-change="(rows) => selectedShipments = rows.map(r => r.id)"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column type="expand">
            <template #default="{ row: sh }">
              <div v-loading="sh._loading" style="width: 100%; overflow-x: auto">
                <el-table :data="sh._items" border size="small" empty-text="暂无明细">
                  <el-table-column label="试剂名称" prop="reagentName" min-width="160" />
                  <el-table-column label="BAS号" min-width="140" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.basNo || '-' }}</template>
                  </el-table-column>
                  <el-table-column label="需求数量" width="90">
                    <template #default="scope">{{ scope.row.requestedQty ?? '-' }}</template>
                  </el-table-column>
                  <el-table-column label="供应商" min-width="130" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.vendor || '-' }}</template>
                  </el-table-column>
                  <el-table-column label="品牌" min-width="110" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.brand || '-' }}</template>
                  </el-table-column>
                  <el-table-column label="试剂编号" prop="basId" min-width="110" />
                  <el-table-column label="货号" prop="catNo" min-width="100" />
                  <el-table-column label="规格/浓度" prop="content" min-width="90" />
                  <el-table-column label="批号" prop="lotNo" min-width="110" />
                  <el-table-column label="储存温度" prop="storageTemp" min-width="120" />
                  <el-table-column label="储存位置" prop="storageLocation" min-width="120" />
                  <el-table-column label="过期日期" width="110">
                    <template #default="scope">{{ scope.row.expirationDate ? formatDate(scope.row.expirationDate) : '-' }}</template>
                  </el-table-column>
                  <el-table-column label="发货数量" prop="quantityShipped" min-width="80" />
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="发货单号" prop="shipmentNo" min-width="170" />
          <el-table-column label="快递公司" min-width="150">
            <template #default="scope">
              <el-select
                v-if="scope.row._editing"
                v-model="scope.row.expressCompany"
                size="small"
                placeholder="物流公司"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option v-for="item in expressCompanyOptions" :key="item" :label="item" :value="item" />
              </el-select>
              <span v-else>{{ scope.row.expressCompany || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="快递单号" min-width="170">
            <template #default="scope">
              <el-input v-if="scope.row._editing" v-model="scope.row.trackingNumber" size="small" placeholder="快递单号" />
              <span v-else>{{ scope.row.trackingNumber || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="发货时间" min-width="170">
            <template #default="scope">{{ formatDate(scope.row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="170">
            <template #default="scope">
              <template v-if="!scope.row._editing">
                <el-button link type="primary" size="small" @click="startEditLogistics(scope.row)">编辑物流</el-button>
                <el-button link type="warning" size="small" @click="handleRevokeShipment(scope.row.id)">撤回</el-button>
              </template>
              <template v-else>
                <el-button link type="primary" size="small" @click="saveLogistics(scope.row)">保存</el-button>
                <el-button link type="info" size="small" @click="cancelEditLogistics(scope.row)">取消</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
        <el-table
          v-else
          ref="shipmentTableRef" style="width: 100%"
          :data="shipmentHistory"
          border
          size="small"
          empty-text="暂无发货记录"
          @expand-change="onShipmentExpand"
          @selection-change="(rows) => selectedShipments = rows.map(r => r.id)"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column type="expand">
            <template #default="{ row: sh }">
              <div v-loading="sh._loading" style="width: 100%; overflow-x: auto">
                <el-table :data="sh._items" border size="small" empty-text="暂无明细">
                  <el-table-column label="试剂名称" prop="reagentName" min-width="160" />
                  <el-table-column label="BAS号" min-width="140" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.basNo || '-' }}</template>
                  </el-table-column>
                  <el-table-column label="需求数量" width="90">
                    <template #default="scope">{{ scope.row.requestedQty ?? '-' }}</template>
                  </el-table-column>
                  <el-table-column label="供应商" min-width="130" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.vendor || '-' }}</template>
                  </el-table-column>
                  <el-table-column label="品牌" min-width="110" show-overflow-tooltip>
                    <template #default="scope">{{ scope.row.brand || '-' }}</template>
                  </el-table-column>
                  <el-table-column label="试剂编号" prop="basId" min-width="110" />
                  <el-table-column label="货号" prop="catNo" min-width="100" />
                  <el-table-column label="规格/浓度" prop="content" min-width="90" />
                  <el-table-column label="批号" prop="lotNo" min-width="110" />
                  <el-table-column label="储存温度" prop="storageTemp" min-width="120" />
                  <el-table-column label="储存位置" prop="storageLocation" min-width="120" />
                  <el-table-column label="过期日期" width="110">
                    <template #default="scope">{{ scope.row.expirationDate ? formatDate(scope.row.expirationDate) : '-' }}</template>
                  </el-table-column>
                  <el-table-column label="发货数量" prop="quantityShipped" min-width="80" />
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="发货单号" prop="shipmentNo" min-width="170" />
          <el-table-column label="快递公司" min-width="150">
            <template #default="scope">
              <el-select
                v-if="scope.row._editing"
                v-model="scope.row.expressCompany"
                size="small"
                placeholder="物流公司"
                filterable
                allow-create
                default-first-option
                style="width: 100%"
              >
                <el-option v-for="item in expressCompanyOptions" :key="item" :label="item" :value="item" />
              </el-select>
              <span v-else>{{ scope.row.expressCompany || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="快递单号" min-width="170">
            <template #default="scope">
              <el-input v-if="scope.row._editing" v-model="scope.row.trackingNumber" size="small" placeholder="快递单号" />
              <span v-else>{{ scope.row.trackingNumber || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="发货时间" min-width="170">
            <template #default="scope">{{ formatDate(scope.row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="170">
            <template #default="scope">
              <template v-if="!scope.row._editing">
                <el-button link type="primary" size="small" @click="startEditLogistics(scope.row)">编辑物流</el-button>
                <el-button link type="warning" size="small" @click="handleRevokeShipment(scope.row.id)">撤回</el-button>
              </template>
              <template v-else>
                <el-button link type="primary" size="small" @click="saveLogistics(scope.row)">保存</el-button>
                <el-button link type="info" size="small" @click="cancelEditLogistics(scope.row)">取消</el-button>
              </template>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- ==================== 收货/发货信息区块 ==================== -->
      <el-divider content-position="left">
        收发信息
        <el-button v-if="mode !== 'edit'" size="small" type="primary" link @click="showAddress = !showAddress">
          {{ showAddress ? '收起' : '展开' }}
        </el-button>
      </el-divider>
      <template v-if="showAddress">
      <el-row :gutter="12">
        <el-col :span="12">
          <fieldset style="border: 1px solid #dcdfe6; border-radius: 4px; padding: 8px 12px">
            <legend style="font-weight: bold; color: #409eff">
              发货方信息
              <el-button
                v-if="!isReadonly"
                size="small"
                :type="formData.region === '上海' ? 'warning' : 'info'"
                :plain="formData.region !== '上海'"
                style="margin-left: 8px"
                @click="fillConsignorShanghai"
              >{{ formData.region === '上海' ? '✓ ' : '' }}上海地址</el-button>
              <el-button
                v-if="!isReadonly"
                size="small"
                :type="formData.region === '宁波' ? 'success' : 'info'"
                :plain="formData.region !== '宁波'"
                @click="fillConsignorNingbo"
              >{{ formData.region === '宁波' ? '✓ ' : '' }}宁波地址</el-button>
            </legend>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="联系人" prop="consignorName" class="mb-8px">
                  <el-input v-model="formData.consignorName" :disabled="isReadonly" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="电话" prop="consignorPhone" class="mb-8px">
                  <el-select
                    v-model="formData.consignorPhone"
                    :disabled="isReadonly"
                    placeholder="请选择或输入电话"
                    filterable
                    allow-create
                    default-first-option
                    style="width: 100%"
                  >
                    <el-option v-for="opt in consignorPhoneOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="单位" prop="consignorUnit" class="mb-8px">
              <el-input v-model="formData.consignorUnit" :disabled="isReadonly" />
            </el-form-item>
            <el-form-item label="地址" prop="consignorAddress" class="mb-0">
              <el-input v-model="formData.consignorAddress" :disabled="isReadonly" />
            </el-form-item>
          </fieldset>
        </el-col>
        <el-col :span="12">
          <fieldset style="border: 1px solid #dcdfe6; border-radius: 4px; padding: 8px 12px">
            <legend style="font-weight: bold; color: #e6a23c">接收方信息（必填）</legend>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item label="联系人" prop="receiverName" class="mb-8px">
                  <el-input v-model="formData.receiverName" :disabled="isReadonly" placeholder="请输入联系人" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="电话" prop="receiverPhone" class="mb-8px">
                  <el-input v-model="formData.receiverPhone" :disabled="isReadonly" placeholder="请输入联系电话" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="单位" prop="receiverUnit" class="mb-8px">
              <el-input v-model="formData.receiverUnit" :disabled="isReadonly" placeholder="请输入接收单位" />
            </el-form-item>
            <el-form-item label="地址" prop="receiverAddress" class="mb-0">
              <el-input v-model="formData.receiverAddress" :disabled="isReadonly" placeholder="请输入接收地址" />
            </el-form-item>
          </fieldset>
        </el-col>
      </el-row>
      </template>
    </el-form>

    <!-- ==================== 底部操作按钮 ==================== -->
    <template #footer>
      <div style="display: flex; justify-content: space-between; width: 100%">
        <div>
          <!-- 样品组：拒绝/退回按钮 -->
          <el-button
            v-if="mode === 'ship' && formData.status === 1"
            type="danger"
            :loading="formLoading"
            @click="handleReject"
          >
            拒绝/退回
          </el-button>
        </div>
        <div>
          <el-button @click="dialogVisible = false">取 消</el-button>
          <!-- 项目组：保存/提交按钮 -->
          <template v-if="mode === 'create' || mode === 'edit'">
            <el-button type="primary" :loading="formLoading" @click="handleSave">
              保存草稿
            </el-button>
            <el-button type="success" :loading="formLoading" @click="handleSaveAndSubmit">
              保存并提交
            </el-button>
          </template>
          <!-- 样品组：确认发货按钮 -->
          <template v-if="mode === 'ship'">
            <el-button type="primary" :loading="formLoading" @click="handleConfirmShip">
              确认发货
            </el-button>
          </template>
        </div>
      </div>
    </template>

    <!-- ============ 选择试剂批号弹窗（老ERP同步扁平表，一行=一批，分页 + 双击确定） ============ -->
    <el-dialog v-model="flatPickerVisible" title="选择试剂批号" width="1200px" top="4vh" append-to-body>
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="关键词">
          <el-input
            v-model="flatKeyword"
            placeholder="试剂名称 / 编号 / BAS号 / 货号"
            clearable
            class="!w-320px"
            @keyup.enter="onFlatSearch"
            @clear="onFlatSearch"
          >
            <template #prefix><Icon icon="ep:search" /></template>
          </el-input>
        </el-form-item>
        <el-form-item label="仓库">
          <el-input
            v-model="flatWarehouse"
            placeholder="仓库名称，模糊匹配"
            clearable
            class="!w-160px"
            @keyup.enter="onFlatSearch"
            @clear="onFlatSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onFlatSearch"><Icon icon="ep:search" />搜索</el-button>
          <el-button @click="resetFlatSearch">重置</el-button>
        </el-form-item>
        <el-form-item class="!mb-0">
          <span class="text-gray-400 text-12px">点击选中一行，双击直接确定</span>
        </el-form-item>
      </el-form>
      <el-table
        v-loading="flatLoading"
        :data="flatList"
        height="520"
        border
        highlight-current-row
        @current-change="flatCurrent = $event"
        @row-dblclick="confirmFlatPick"
      >
        <el-table-column type="index" label="#" width="46" align="center" />
        <el-table-column label="BAS号" prop="basId" width="130" show-overflow-tooltip />
        <el-table-column label="仓库" prop="warehouse" width="120" show-overflow-tooltip />
        <el-table-column label="试剂名称" prop="reagentName" min-width="170" show-overflow-tooltip />
        <el-table-column label="供应商" prop="vendor" width="120" show-overflow-tooltip />
        <el-table-column label="品牌" prop="brand" width="110" show-overflow-tooltip />
        <el-table-column label="试剂编号" prop="reagentCode" width="110" show-overflow-tooltip />
        <el-table-column label="货号" prop="catNo" width="110" show-overflow-tooltip />
        <el-table-column label="规格" prop="spec" width="140" show-overflow-tooltip />
        <el-table-column label="批号" prop="lotNo" width="120" show-overflow-tooltip />
        <el-table-column label="参考剩余量" prop="amountLeft" width="100" align="right" />
        <el-table-column label="储存温度" prop="storageTemp" width="90" />
        <el-table-column label="过期日期" width="110">
          <template #default="scope">
            <span>{{ scope.row.expireDate || '-' }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="mt-8px" style="display: flex; justify-content: space-between; align-items: center">
        <span class="text-gray-400 text-12px">共 {{ flatTotal }} 条</span>
        <Pagination
          v-model:limit="flatQuery.pageSize"
          v-model:page="flatQuery.pageNo"
          :total="flatTotal"
          @pagination="onFlatSearch"
        />
      </div>
      <template #footer>
        <el-button type="primary" :disabled="!flatCurrent" @click="confirmFlatPick">确 定</el-button>
        <el-button @click="flatPickerVisible = false">取 消</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script lang="ts" setup>
import * as ReagentApi from '@/api/reagent/index'
import { formatDate } from '@/utils/formatTime'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { nextTick } from 'vue'

defineOptions({ name: 'ReagentDeliveryForm' })

const message = useMessage()

const emit = defineEmits(['success'])

// ==================== 模式与可见性 ====================
const dialogVisible = ref(false)
const formLoading = ref(false)
const formRef = ref()
const mode = ref<string>('') // 'create' | 'edit' | 'view' | 'ship'
const editingId = ref<number>()
const showAddress = ref(false)

const dialogTitle = computed(() => {
  const map: Record<string, string> = {
    create: '新增申请单（项目组提单）',
    edit: '编辑申请单',
    view: '查看申请单详情',
    ship: '处理发货（样品组）'
  }
  return map[mode.value] || '申请单'
})

const isReadonly = computed(() => mode.value === 'view' || mode.value === 'ship')

// 发货方电话选项：按当前区域（上海/宁波）只显示本区域号码
const consignorPhoneOptions = computed(() => {
  const isNingbo =
    (formData.consignorUnit || '').includes('宁波') ||
    (formData.consignorAddress || '').includes('宁波')
  if (isNingbo) {
    return [
      { label: '0574-87878472-821', value: '0574-87878472-821' },
      { label: '+8618067448732', value: '+8618067448732' }
    ]
  }
  return [
    { label: '18117369294', value: '18117369294' }
  ]
})

// 发货方地址快速填充
const fillConsignorShanghai = () => {
  formData.region = '上海'
  Object.assign(formData, {
    consignorUnit: '上海精翰生物科技有限公司',
    consignorAddress: '上海市浦东新区(上海)自由贸易试验区加枫路8号7层A32',
    consignorName: '精翰样品管理组',
    consignorPhone: '18117369294'
  })
}
const fillConsignorNingbo = () => {
  formData.region = '宁波'
  Object.assign(formData, {
    consignorUnit: '宁波熙宁检测技术有限公司',
    consignorAddress: '浙江省宁波市高新区聚贤路587弄科技大市场A5-8楼',
    consignorName: '宁波样品管理组',
    consignorPhone: '0574-87878472-821'
  })
}

// ==================== 表单数据 ====================
const formData = reactive<ReagentApi.ReagentApplyVO>({
  consignorUnit: '',
  consignorAddress: '',
  consignorName: '',
  consignorPhone: '',
  region: '',
  receiverUnit: '',
  receiverAddress: '',
  receiverName: '',
  receiverPhone: '',
  freightSettlement: '',
  projectNo: '',
  transportTemp: '',
  hasTempLogger: 0,
  plannedShipDate: '',
  note: '',
  items: []
})

const formRules = {
  region: [{ required: true, message: '请选择发货区域（上海/宁波）', trigger: 'change' }],
  freightSettlement: [{ required: true, message: '请选择运费结算方式', trigger: 'change' }],
  transportTemp: [{ required: true, message: '请输入运输温度', trigger: 'blur' }],
  receiverUnit: [{ required: true, message: '接收方单位不能为空', trigger: 'blur' }],
  receiverAddress: [{ required: true, message: '接收方地址不能为空', trigger: 'blur' }],
  receiverName: [{ required: true, message: '接收联系人不能为空', trigger: 'blur' }],
  receiverPhone: [
    { required: true, message: '接收联系电话不能为空', trigger: 'blur' },
    { pattern: /^(\+?86)?1[3-9]\d{9}$|^\d{3,4}-\d{7,8}(-\d{1,6})?$/, message: '请输入正确的手机号/座机号（支持+86或86开头手机号，座机可带分机）', trigger: 'blur' }
  ],
  consignorPhone: [
    { pattern: /^(\+?86)?1[3-9]\d{9}$|^\d{3,4}-\d{7,8}(-\d{1,6})?$/, message: '请输入正确的手机号/座机号（支持+86或86开头手机号，座机可带分机）', trigger: 'blur' }
  ]
}

// 物流公司下拉选项（常见快递/物流公司，含冷链与同城）
const expressCompanyOptions = [
  '顺丰速运', '顺丰冷运', '京东物流', '京东冷链', '中通快递', '圆通速递',
  '申通快递', '韵达快递', '极兔速递', '百世快递', '菜鸟速递', '德邦快递',
  '跨越速运', '邮政EMS', '中国邮政', '中邮速递', '天天快递', '宅急送',
  '优速快递', '安能物流', '苏宁物流', '丹鸟', '丰网速运', '闪送',
  '达达', '美团配送', 'DHL', 'FedEx联邦快递', 'UPS', 'TNT'
]

// 物流表单（仅 ship 模式）
const logisticsForm = reactive({
  trackingNumber: '',
  expressCompany: ''
})

// 发货记录
const shipmentHistory = ref<ReagentApi.ReagentShipmentVO[]>([])
const selectedShipments = ref<number[]>([])

// ==================== 打印功能 ====================
const handlePrintSelected = async () => {
  if (selectedShipments.value.length === 0) {
    message.warning('请至少勾选一条发货记录')
    return
  }
  try {
    const res = selectedShipments.value.length === 1
      ? await ReagentApi.printShipment(selectedShipments.value[0])
      : await ReagentApi.printShipments(selectedShipments.value)
    downloadBlob(res, `交接单.xlsx`)
    message.success('打印文件下载中')
  } catch {
    message.error('打印失败')
  }
}

/** Blob 响应下载辅助 */
const downloadBlob = (res: any, fileName: string) => {
  const blob = res instanceof Blob ? res : new Blob([res.data ?? res])
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  window.URL.revokeObjectURL(url)
}

const handleRevokeShipment = async (shipmentId: number) => {
  try { await message.confirm('确认撤回该发货单？将回退已发数量和申请单状态。') } catch { return }
  try {
    await ReagentApi.revokeShipment(shipmentId)
    message.success('已撤回')
    // 重新加载申请单详情（刷新状态）和发货记录
    if (editingId.value) {
      const data = await ReagentApi.getApplyDetail(editingId.value)
      Object.assign(formData, data)
      formData.items = withStorageTempArr(data.items || [])
    }
    await loadShipmentHistory()
    selectedShipments.value = []
    emit('success')
  } catch {
    message.error('撤回失败')
  }
}

/** 开始编辑物流信息（缓存原值，用于取消） */
const startEditLogistics = (row: any) => {
  row._editing = true
  row._origExpressCompany = row.expressCompany
  row._origTrackingNumber = row.trackingNumber
}
/** 取消编辑物流信息：还原原值 */
const cancelEditLogistics = (row: any) => {
  row.expressCompany = row._origExpressCompany
  row.trackingNumber = row._origTrackingNumber
  row._editing = false
}
/** 保存物流信息（快递单号/物流公司） */
const saveLogistics = async (row: any) => {
  try {
    await ReagentApi.updateShipmentLogistics({
      id: row.id,
      trackingNumber: row.trackingNumber,
      expressCompany: row.expressCompany
    })
    message.success('物流信息已保存')
    row._editing = false
  } catch {
    message.error('保存失败')
  }
}

// ==================== 选批号弹窗（老ERP同步扁平表，一行=一批，分页） ====================
const flatList = ref<ReagentApi.ReagentBaseFlatVO[]>([])
const flatTotal = ref(0)
const flatLoading = ref(false)
const flatPickerVisible = ref(false)
const flatPickerIndex = ref(-1)
const flatKeyword = ref('')
const flatWarehouse = ref('')
const flatCurrent = ref<ReagentApi.ReagentBaseFlatVO | null>(null)
const flatQuery = reactive({ pageNo: 1, pageSize: 10 })

// 打开弹窗（默认加载第一页）
const openFlatPicker = (index: number) => {
  flatPickerIndex.value = index
  flatKeyword.value = ''
  flatWarehouse.value = ''
  flatCurrent.value = null
  flatList.value = []
  flatTotal.value = 0
  flatQuery.pageNo = 1
  flatPickerVisible.value = true
  onFlatSearch()
}

// 搜索/翻页（试剂名称/编号/BAS号/货号）
const onFlatSearch = async () => {
  flatLoading.value = true
  try {
    const data = await ReagentApi.getBaseFlatSimpleList({
      keyword: flatKeyword.value,
      warehouse: flatWarehouse.value,
      pageNo: flatQuery.pageNo,
      pageSize: flatQuery.pageSize
    })
    flatList.value = data.list || []
    flatTotal.value = data.total || 0
    // 选中项不在当前页时清掉，避免误确定
    if (flatCurrent.value && !flatList.value.find((x) => x.id === flatCurrent.value!.id)) {
      flatCurrent.value = null
    }
  } catch {
    flatList.value = []
    flatTotal.value = 0
  } finally {
    flatLoading.value = false
  }
}

const resetFlatSearch = () => {
  flatKeyword.value = ''
  flatWarehouse.value = ''
  flatQuery.pageNo = 1
  onFlatSearch()
}

// 确认选择 → 自动带出整行信息
const confirmFlatPick = () => {
  const b = flatCurrent.value
  if (!b || flatPickerIndex.value < 0) return
  const item = formData.items![flatPickerIndex.value]
  item.basId = b.reagentCode || '' // 试剂编号 = 材料编号
  item.basNo = b.basId || '' // BAS号 = 采购入库单号
  item.reagentName = b.reagentName || ''
  item.vendor = b.vendor || ''
  item.brand = b.brand || ''
  item.catNo = b.catNo || ''
  item.content = b.spec || '' // 规格/浓度
  item.lotNo = b.lotNo || ''
  item.storageTemp = b.storageTemp || ''
  ;(item as any).storageTempArr = splitStorageTemp(b.storageTemp)
  item.storageLocation = b.storageLocation || ''
  item.expirationDate = flatExpireToMillis(b.expireDate)
  flatPickerVisible.value = false
}

// 过期日期字符串 → 毫秒（后端 LocalDateTime 接收，兼容 2026-01-01 / 2026/01/01 00:00:00）
// 注意：el-date-picker value-format="x" 期望的是「数字」毫秒时间戳，
// 传字符串会被 element-plus 内部 dayjs(date) 误解析（如 "1648742400000" → 1654-02-24）
const flatExpireToMillis = (s?: string): number | '' => {
  if (!s) return ''
  const v = String(s).trim().replace(/\//g, '-')
  // 占位/空值标记（TBD/NA/无/- 等）与 1970 老空值 → 空
  if (/^(TBD|NA|N\/A|无|-)$/i.test(v) || v.startsWith('1970')) return ''
  const norm = v.length >= 10 ? v.slice(0, 10) + (v.length > 10 ? 'T' + v.slice(11).trim() : 'T00:00:00') : v
  const t = new Date(norm)
  return isNaN(t.getTime()) ? '' : t.getTime()
}

// ==================== 储存温度多选（逗号拼接落库） ====================
/** "2-8°C,避光保存" → ["2-8°C","避光保存"] */
const splitStorageTemp = (v?: string | null): string[] =>
  v ? String(v).split(',').map((s: string) => s.trim()).filter(Boolean) : []

/** 多选数组 → 逗号拼接字符串 */
const joinStorageTemp = (arr?: string[] | null): string => (arr || []).join(',')

/** 给明细行附加编辑用 storageTempArr（数组），storageTemp 保持逗号字符串不变 */
const withStorageTempArr = (list: any[]) =>
  (list || []).map((it: any) => ({ ...it, storageTempArr: splitStorageTemp(it.storageTemp) }))

/** 提交前把明细行多选数组写回 storageTemp 字符串 */
const syncItemsStorageTemp = () => {
  for (const it of formData.items || []) {
    it.storageTemp = joinStorageTemp((it as any).storageTempArr)
  }
}

// ==================== 明细行操作 ====================
const addItem = () => {
  const item = {
    basId: '',
    basNo: '',
    reagentName: '',
    vendor: '',
    brand: '',
    catNo: '',
    content: '',
    lotNo: '',
    storageTemp: '',
    storageTempArr: [] as string[],
    storageLocation: '',
    expirationDate: '',
    requestedQty: 1,
    shippedQtyTotal: 0
  } as ReagentApi.ReagentApplyItemVO
  formData.items!.push(item)
}

const removeItem = (index: number) => {
  formData.items!.splice(index, 1)
}

// ==================== 打开发货记录 ====================
const loadShipmentHistory = async () => {
  if (!editingId.value) return
  try {
    const list = await ReagentApi.getShipmentListByApplyId(editingId.value)
    shipmentHistory.value = list.map((s: any) => ({ ...s, _loading: false, _items: [] }))
  } catch {
    shipmentHistory.value = []
  }
}

// 展开发货单 → 加载发货明细
const onShipmentExpand = async (row: any, expandedRows: any[]) => {
  if (expandedRows.includes(row) && (!row._items || row._items.length === 0)) {
    row._loading = true
    try {
      const detail = await ReagentApi.getShipmentDetail(row.id)
      // 用 applyItemId 联查 apply_item 补上试剂名称
      const applyData = await ReagentApi.getApplyDetail(formData.id!)
      const itemMap = new Map((applyData.items || []).map((i: any) => [i.id, i]))
      row._items = (detail.items || []).map((si: any) => {
        const ai = itemMap.get(si.applyItemId) || {}
        return { ...si, ...ai, lotNo: si.lotNo || ai.lotNo, quantityShipped: si.quantityShipped }
      })
    } catch {
      row._items = []
    } finally {
      row._loading = false
    }
  }
}

// ==================== 打开弹窗 ====================
const open = async (m: string, id?: number) => {
  mode.value = m
  editingId.value = id
  dialogVisible.value = true
  formLoading.value = true
  // 收发信息：新增/编辑默认展开；编辑模式下不可折叠（区域必选等信息需可见）
  showAddress.value = m === 'create' || m === 'edit'

  // 批号选择为远程搜索，无需预加载

  // 重置表单
  Object.assign(formData, {
    id: undefined,
    consignorUnit: '',
    consignorAddress: '',
    consignorName: '',
    consignorPhone: '',
    region: '',
    receiverUnit: '',
    receiverAddress: '',
    receiverName: '',
    receiverPhone: '',
    remark: '',
    freightSettlement: '',
    projectNo: '',
    transportTemp: '',
    hasTempLogger: 0,
    items: []
  })
  Object.assign(logisticsForm, { trackingNumber: '', expressCompany: '' })
  shipmentHistory.value = []

  if ((m === 'edit' || m === 'view' || m === 'ship') && id) {
    try {
      const data = await ReagentApi.getApplyDetail(id)
      Object.assign(formData, data)
      // 明细行：附加编辑用 storageTempArr（多选数组）与 ship 模式临时 _shipQty
      formData.items = (data.items || []).map((item: any) => ({
        ...item,
        _shipQty: 0,
        storageTempArr: splitStorageTemp(item.storageTemp)
      }))
    } catch {
      message.error('加载申请单失败')
    }

    // 加载发货记录
    if (m === 'ship' || m === 'view') {
      await loadShipmentHistory()
    }
  }
  formLoading.value = false
}

defineExpose({ open })

// ==================== 保存草稿 ====================
const handleSave = async () => {
  if (!formData.items || formData.items.length === 0) {
    message.warning('请至少添加一条试剂明细')
    return
  }
  if (!formData.region) {
    message.warning('请选择发货区域（上海地址 / 宁波地址）')
    return
  }
  await formRef.value?.validate()
  syncItemsStorageTemp()
  formLoading.value = true
  try {
    if (mode.value === 'create') {
      await ReagentApi.createApply(formData)
      message.success('申请单创建成功')
    } else {
      await ReagentApi.updateApply(formData)
      message.success('申请单修改成功')
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

// ==================== 保存并提交 ====================
const handleSaveAndSubmit = async () => {
  if (!formData.items || formData.items.length === 0) {
    message.warning('请至少添加一条试剂明细')
    return
  }
  if (!formData.region) {
    message.warning('请选择发货区域（上海地址 / 宁波地址）')
    return
  }
  await formRef.value?.validate()
  syncItemsStorageTemp()
  formLoading.value = true
  try {
    if (mode.value === 'create') {
      const id = await ReagentApi.createApply(formData)
      if (id) {
        await ReagentApi.submitApply(id)
      }
    } else {
      await ReagentApi.updateApply(formData)
      if (formData.id) {
        await ReagentApi.submitApply(formData.id)
      }
    }
    message.success('已保存并提交')
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}

// ==================== 拒绝/退回 ====================
const handleReject = async () => {
  try {
    const { value: remark } = await ElMessageBox.prompt('请输入拒绝/退回理由', '拒单退回', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputValidator: (val: string) => val && val.trim() ? true : '理由不能为空'
    })
    if (!remark) return
    formLoading.value = true
    await ReagentApi.rejectApply({ id: editingId.value!, remark })
    message.success('已退回')
    dialogVisible.value = false
    emit('success')
  } catch {
    // 用户取消
  } finally {
    formLoading.value = false
  }
}

// ==================== 确认发货 ====================
const handleConfirmShip = async () => {
  if (formData.freightSettlement === '我司（后续据实结算）' && !formData.projectNo?.trim()) {
    message.warning('我司结算时项目号必填')
    return
  }
  const shipmentItems = (formData.items || [])
    .filter((item: any) => item._shipQty > 0)
    .map((item: any) => ({
      applyItemId: item.id,
      lotNo: item.lotNo,
      quantityShipped: item._shipQty
    }))
  if (shipmentItems.length === 0) {
    message.warning('请至少填写一项本次发货数量')
    return
  }

  formLoading.value = true
  await nextTick()  // 让 loading 遮罩先渲染出来
  try {
    await message.confirm(
      `确认发货？共 ${shipmentItems.length} 项${logisticsForm.trackingNumber ? `，快递单号: ${logisticsForm.trackingNumber}` : ''}`
    )
  } catch {
    formLoading.value = false
    return
  }

  try {
    await ReagentApi.confirmShipment({
      applyId: editingId.value,
      trackingNumber: logisticsForm.trackingNumber,
      expressCompany: logisticsForm.expressCompany,
      freightSettlement: formData.freightSettlement,
      projectNo: formData.projectNo,
      transportTemp: formData.transportTemp,
      hasTempLogger: formData.hasTempLogger,
      items: shipmentItems
    })
    message.success('发货成功')
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
